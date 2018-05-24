const fs = require('graceful-fs');
const { URL } = require('url');
const csvParse = require('csv-parse');
const ProgressBar = require('ascii-progress');
var inputFile,
	input;
var validUrl = require('valid-url');
var phantom = require('x-ray-phantom');
var Xray = require('x-ray');
var x = Xray();
///// Need to figure out how to scrape dynamic pages w/ phantom
//	.driver(phantom());
var natural = require('natural');
var classifier = new natural.BayesClassifier();
var restoredClassifier = natural.BayesClassifier.restore(JSON.parse(fs.readFileSync("classifier.json")));
/// SETTINGS
const SKIP_EXISTING = true;
const timeoutSeconds = 15;
const concurrency = 50;


/////////////////////////////////////////


/// SETUP
//
if (process.argv[2]) {
	inputFile = process.argv[2];
} else {
	console.log('NO INPUT FILE');
}

const getMeaning = function(url, text, filename) {
	var analysis = txtAnalysis(text, url);
	// commented out bayes classifier for now
	//var bayesIndustry = restoredClassifier.classify(siteText);
	//let txt = [title, "", analysis.match_score_industry, analysis.score, bayesIndustry].join(",") + '\n';
	let txt = [url, "", analysis.match_score_industry, analysis.score].join(",") + '\n';
	//////////////


	fs.appendFile('output.csv', txt, (err) => {
		if (err) throw err;
		if (fs.existsSync(filename)) {
			deleteFile(filename);
		};
	});
};


///// Text analysis
const industries = JSON.parse(fs.readFileSync("industries.json"));

function txtAnalysis(text, url) {
	let score = 0
	let obj = {
		match_score_industry: "",
		score: ""
	};
	arr = [obj];

	for (var i = 0; i < industries.length; i++) {
		//// Must have at least one "positive" keyword
		if (industries[i].positive.length < 1 || countStrings(industries[i].positive, text) > 0) {
			//// Must not contain ANY "negative" keywords
			if (industries[i].negative.length < 1 || countStrings(industries[i].negative, text) == 0) {			
				relevant = countStrings(industries[i].relevant, text);
				irrelevant = countStrings(industries[i].irrelevant, text);
				score = relevant - irrelevant;
				obj = {
					match_score_industry:  industries[i].industry,
					score: score
				};
				arr.push(obj);
			};
		};
	};
	///// Sort multiple results and return the highest scoring 
	arr.sort(function(b, a) {
   		return a.score - b.score;
	});

	// Header size debugging
	//if (arr[0].match_score_industry == '') {
	//	console.log(text.replace(/[\n\r]+/g, '').replace(/\s{2,10}/g, ' ').substring(0,128));
	//}

	return arr[0];
};

function countStrings(list, text, url){
	let sum = 0
	for (var i = 0; i < list.length; i++) {
		let regex = RegExp(list[i], "gis");
		sum += (text.match(regex) || []).length;
	};
	return sum;
};

var bar = new ProgressBar({ 
				schema: ':bar :percent :elapseds :eta',
				width: 80,
			});
var count = 0;
var progress = 0;
function progressUpdate(totalCount){
	count += 1;
	progress = count/totalCount;
	bar.update(progress);
};
function appendErr(url, err, totalCount) {
	let errTxt = [url, err, "", ""].join(",") + '\n';
	fs.appendFile('output.csv', errTxt, (err) => {if (err) throw err});
	progressUpdate(totalCount);
};
////Need to fix this before scanning a large data set :(
function deleteFile(filename) {
	fs.unlink(filename, function(error) {
	    if (error) {
	        //throw error; <--do nothing :(
	    }
	});
}
///// RUN
// omg callback hell, I hate you so much @TODO promisify this
if (inputFile) {
	// read input file
	fs.readFile(inputFile, 'utf8', (err, fileContents) => {
		if (err) throw err;

		//console.log("URL,ERROR,INDUSTRY,SCORE");
		fs.writeFile('output.csv', 'URL,ERROR,MATCH_SCORE_INDUSTRY,SCORE,BAYES_INDUSTRY\n', (err) => {if (err) throw err});
		// get data from input file
		csvParse(fileContents, {}, function(err, data) {
			if (err) throw err;
			// loop through contents of input file
			let totalCount = data.length;
			data.forEach(function(row) {
				var url = row[0]; 
			    if (validUrl.isUri(url)){
			        const urlData = new URL(url);
			        const filename = 'scraped/' + urlData.hostname;
					///// XRAY scraper. TODO crawl 1 page deep

					x.timeout(timeoutSeconds*1000).concurrency(concurrency)(url, 'body')(function(err, res) {
						if (err) {
							appendErr(url, err, totalCount);
						} else if (res == "") {
							appendErr(url, "Error: No content returned", totalCount);
						} else {
							fs.open(filename, 'r', (err, fd) => {
								// file doesn't exist, retrieve
								if (!SKIP_EXISTING || (err && err.code == 'ENOENT')) {
									fs.writeFile(filename, res, (err) => {
										if (err) throw err;
										//console.log('Scraped content for ' + url + ' into ' + filename);
										getMeaning(url, res, filename);
									});
								
								// file already exists, skip
								} else {
									//console.log('Content for ' + url + ' already scraped into ' + filename + ', skipping');
									fs.readFile(filename, 'utf8', (err, data) => {
										getMeaning(url, data, filename);
									});
								}
							});
						};
						progressUpdate(totalCount);
					});
				} else {
			        //console.log([url, "Invalid URL", "", ""].join(","));
			        appendErr(url, "Invalid URL", totalCount);
			    };
			});
		});
	});
};



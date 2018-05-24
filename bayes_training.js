const fs = require('fs');
const { URL } = require('url');
const csvParse = require('csv-parse');
const ProgressBar = require('ascii-progress');
var inputFile,
	bayesTrainer;
var validUrl = require('valid-url');
var Xray = require('x-ray');
var x = Xray();
var natural = require('natural');
var classifier = new natural.BayesClassifier();

/// SETTINGS
const SKIP_EXISTING = true;
const timeoutSeconds = 10;
const concurrency = 50;


/////////////////////////////////////////


/// SETUP
//
if (process.argv[2]) {
	inputFile = process.argv[2];
} else {
	console.log('NO INPUT FILE');
}
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
	if(progress == 1) {
		classifier.train();
		classifier.save('classifier.json', function(err, classifier) {
    		console.log("done!");
		});
		//var stateJson = classifier.toJson();
		//fs.writeFile('classifier.json',stateJson, (err) => {if (err) throw err});
	};
};

function appendErr(url, err, totalCount) {
	let errTxt = [url, err, "", ""].join(",") + '\n';
	fs.appendFile('bayesOutput.csv', errTxt, (err) => {if (err) throw err});
	progressUpdate(totalCount);
};

////Need to fix this before scanning a large data set :(
function deleteFile(filename) {
	//fs.unlink(filename, function(error) {
	//    if (error) {
	//        throw error;
	//    }
	//});
}

///// RUN
// omg callback hell, I hate you so much @TODO promisify this
if (inputFile) {
	// read input file
	fs.readFile(inputFile, 'utf8', (err, fileContents) => {
		if (err) throw err;
		fs.writeFile('bayesOutput.csv', 'URL,ERROR\n', (err) => {if (err) throw err});
		// get data from input file
		csvParse(fileContents, {}, function(err, data) {
			if (err) throw err;
			// loop through contents of input file
			let totalCount = data.length;
			data.forEach(function(row) {
				var url = row[0];
				var bayesIndustry = row[1] ; 
			    if (validUrl.isUri(url)){
			        const urlData = new URL(url);
			        const filename = 'bayesScraped/' + urlData.hostname;
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
										classifier.addDocument(res, bayesIndustry);
										deleteFile(filename);
									});
								// file already exists, skip
								} else {
									fs.readFile(filename, 'utf8', (err, data) => {
										classifier.addDocument(res, bayesIndustry);
										deleteFile(filename);
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





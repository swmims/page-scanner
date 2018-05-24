# install it
`npm install`

# use it
In these examples, `input.txt` is a text file containing one URL per row.  Result will be a CSV of data, one row per matching context, which might mean >1 rows per input URL.

Scan list, record results into `output.csv`, and display progress:
`node index.js input.txt`

# filter it
Define website industries in industries.json. Positive keywords are required to be categorized in this industry. Negative keywords act as stop words and any page with a negative keyword will not be categorized in this industry. Relevant keywords add one point to the industry score for every instance the keyword is found on the page. Irrelevant keywords subtract one point to the industry score for every instance the keyword is found on the page. Regex is allowed in keyword. Only include the pattern, not the `/` or modifiers. The default modifier is `/gis`. For example a keyword could be as simple as:
`keyword`
or, as complex as:
`keyword1.*keyword2|keyword2.*keyword1`
The first example will simpley search for "keyword" on the page. The secon example will search for the precense of both keyword1 AND keyword2 in any order on the page.

# Don't  hate
This is my first node.js code and it's full of holes. I'm a script kitty, don't hate.

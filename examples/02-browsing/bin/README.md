# Article scraper

## Overview

This is a quick-and-dirty scraper for the [most vital articles](https://en.wikipedia.org/wiki/Wikipedia:Vital_articles) on Wikipedia. We chose Wikipedia for this example because of their excellent content and generous reuse policies. 

You have [donated](https://donate.wikimedia.org/wiki/Ways_to_Give), right?

The scraper does a DOM-based scrape of the index page, then calls the summary API for each article.  Each request is cached locally so we can play with the output without hammering their servers unduly.

## How to run

```sh
npm install
node build-article-json.js > ../top-1000.json
```

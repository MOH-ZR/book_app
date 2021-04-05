'use strict';

// Application Dependencies
const express = require('express');
const superagent = require('superagent');

// Application Setup
const app = express();
const PORT = process.env.PORT || 3000;

// tell server that all stylesheets inside public 
app.use(express.static(__dirname + '/public'));

// Application Middleware
app.use(express.urlencoded({ extended: true }));

// Set the view engine for server-side templating
app.set('view engine', 'ejs');

// API Routes
// Renders the home page
app.get('/', renderHomePage);

// Renders the search form
app.get('/searches/new', showForm);

// Creates a new search to the Google Books API
app.post('/searches', createSearch);

// Catch-all
app.get('*', (request, response) => response.status(404).send('This route does not exist'));

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));

// Constructor
function Book(info) {
    this.image = info.imageLinks.smallThumbnail || 'https://i.imgur.com/J5LVHEL.jpeg';
    this.title = info.title || 'No title available';
    this.author = info.authors || ' ';
    this.description = info.description || ' ';
}

// Note that .ejs file extension is not required
function renderHomePage(request, response) {
    response.render('pages/index');
}

function showForm(request, response) {
    response.render('pages/searches/new');
}

// No API key required
function createSearch(request, response) {
    const url = 'https://www.googleapis.com/books/v1/volumes';

    // add the search query to the URL
    const searchBy = request.body.searchBy;
    const searchValue = request.body.search;
    const queryObj = {};
    if (searchBy === 'title') {
        queryObj['q'] = `intitle:${searchValue}`;

    } else if (searchBy === 'author') {
        queryObj['q'] = `inauthor:${searchValue}`;
    }

    // send the URL to the servers API
    superagent.get(url).query(queryObj).then(apiResponse => {
        return apiResponse.body.items.map(bookResult => {
            return new Book(bookResult.volumeInfo);
        });
    }).then(results => {
        response.render('pages/searches/show', { searchResults: results })
    }).catch((error) => {
        response.status(500).render('pages/error');
    });;
}
'use strict';
require('dotenv').config();

// Application Dependencies
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const cors = require('cors');


// Application Setup
const app = express();
const PORT = process.env.PORT || 3030;
const DATABASE_URL = process.env.DATABASE_URL;
app.use(cors());

// Database Connection Setup
const client = new pg.Client({
    connectionString: DATABASE_URL,
});



// tell server that all stylesheets inside public 
app.use(express.static(__dirname + '/public'));

// Application Middleware
app.use(express.urlencoded({ extended: true }));

// Set the view engine for server-side templating
app.set('view engine', 'ejs');

// API Routes
// Renders the home page
app.get('/', renderHomePage);

app.get('/books/:id', viewBookDetails);

app.post('/books', addBook)
    // Renders the search form
app.get('/searches/new', showForm);

// Creates a new search to the Google Books API
app.post('/searches', createSearch);

// Catch-all
app.get('*', (request, response) => response.status(404).send('This route does not exist'));

// app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));

// Constructor
function Book(info) {
    this.image = info.imageLinks.smallThumbnail || 'https://i.imgur.com/J5LVHEL.jpeg';
    this.title = info.title || 'No title available';
    this.author = info.authors || ' ';
    this.isbn = info.industryIdentifiers[0].identifier || ' '
    this.description = info.description || ' ';
}

// Note that .ejs file extension is not required
function renderHomePage(request, response) {
    const sqlQuery = `SELECT * FROM books`;

    // query the database
    client.query(sqlQuery).then(results => {

        response.render('pages/index', { savedBooks: results.rows, booksNumber: results.rows.length })
    });
}

function addBook(request, response) {
    const { title, author, isbn, image, description } = request.body;
    const safeValues = [title, author, isbn, image, description];
    const bookObj = {
        'image_url': image,
        'title': title,
        'author': author,
        'isbn': isbn,
        'description': description
    }
    const sqlQuery = 'INSERT INTO books (title, author, isbn, image_url, description) VALUES ($1, $2, $3, $4, $5);';
    client.query(sqlQuery, safeValues).then((results) => {
        response.render('pages/books/show', { bookDetails: bookObj });
    }).catch(error => {
        handleError(error, response);
    });
}

function viewBookDetails(request, response) {

    const bookId = request.params.id;
    const safeValues = [bookId];
    const sqlSelectQuery = 'SELECT * FROM books WHERE id=$1';

    client.query(sqlSelectQuery, safeValues).then(results => {
        response.render('pages/books/show', { bookDetails: results.rows[0] });
    }).catch(error => {
        handleError(error, response);
    });
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

// Connect to DB and Start the Web Server
client.connect().then(() => {
    app.listen(PORT, () => {
        console.log("Connected to database:", client.connectionParameters.database)
        console.log('Server up on', PORT);
    });
})
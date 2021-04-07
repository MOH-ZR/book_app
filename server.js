'use strict';
require('dotenv').config();

// Application Dependencies
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const methodOverride = require('method-override');
const cors = require('cors');

// Environment variables
const PORT = process.env.PORT || 3030;
const DATABASE_URL = process.env.DATABASE_URL;

// Application Setup
const app = express();
app.use(cors());

// Middleware
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Set the view engine for server-side templating
app.set('view engine', 'ejs');

// Database Connection Setup
const client = new pg.Client(process.env.DATABASE_URL);


// Routes
app.get('/', renderHomePage);
app.get('/books/:id', viewBookDetails);
app.get('/searches/new', showForm);
app.post('/books', addBook)
app.post('/searches', createSearch);
app.put('/books/:id', updateBook)
app.delete('/books/:id', deleteBook)

// Constructor function
function Book(info) {
    this.image = info.imageLinks.smallThumbnail || 'https://i.imgur.com/J5LVHEL.jpeg';
    this.title = info.title || 'No title available';
    this.author = info.authors || ' ';
    this.isbn = info.industryIdentifiers[0].identifier || ' ';
    this.description = info.description || ' ';
}


function renderHomePage(request, response) {
    const sqlQuery = `SELECT * FROM books`;
    client.query(sqlQuery).then(results => {
        response.render('pages/index', { savedBooks: results.rows, booksNumber: results.rows.length });
    });
}

function addBook(request, response) {
    const { title, author, isbn, image, description } = request.body;
    const safeValues = [title, author, isbn, image, description];
    const sqlQuery = 'INSERT INTO books (title, author, isbn, image_url, description) VALUES ($1, $2, $3, $4, $5) RETURNING id;';
    client.query(sqlQuery, safeValues).then((result) => response.redirect(`/books/${result.rows[0].id}`));
}

function updateBook(request, response) {
    const bookId = request.params.id;
    const { title, author, isbn, image_url, description } = request.body;
    const safeValues = [title, author, isbn, image_url, description, bookId];

    const updateQuery = 'UPDATE books SET title=$1, author=$2, isbn=$3, image_url=$4, description=$5 WHERE id=$6;';

    client.query(updateQuery, safeValues).then(results => {
        response.redirect(`/books/${bookId}`);
    });
}

function deleteBook(request, response) {
    const bookId = request.params.id;
    console.log(bookId);
    const safeValues = [bookId];
    const deleteQuery = 'DELETE FROM books WHERE id=$1';

    client.query(deleteQuery, safeValues).then(() => {
        response.redirect('/');
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


function createSearch(request, response) {
    const url = 'https://www.googleapis.com/books/v1/volumes';
    const searchBy = request.body.searchBy;
    const searchValue = request.body.search;
    const queryObj = {};

    if (searchBy === 'title') {
        queryObj['q'] = `intitle:${searchValue}`;

    } else if (searchBy === 'author') {
        queryObj['q'] = `inauthor:${searchValue}`;
    }

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

function handleError(error, response) {
    response.render('pages/error-view', { error: error });
}

// Connect to DB and Start the Web Server
client.connect().then(() => {
    app.listen(PORT, () => {
        console.log("Connected to database:", client.connectionParameters.database)
        console.log('Server up on', PORT);
    });
})
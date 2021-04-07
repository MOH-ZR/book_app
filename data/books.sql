DROP TABLE IF EXISTS books;

CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    author TEXT,
    title TEXT,
    isbn TEXT,
    image_url TEXT,
    description TEXT
);
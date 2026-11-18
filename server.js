
const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

let books = fs.existsSync("books.json")
    ? JSON.parse(fs.readFileSync("books.json"))
    : [];

function save() {
    fs.writeFileSync("books.json", JSON.stringify(books, null, 2));
}

// HOME
app.get("/", (req, res) => {
    res.send("Library Management System");
});

// GET - Display all books
app.get("/api/books", (req, res) => {
    res.json(books);
});

// GET - Search book by ID
app.get("/api/books/:id", (req, res) => {
    let book = books.find(b => b.id == req.params.id);
    res.json(book || "Book not found");
});

// POST - Add book
app.post("/api/books", (req, res) => {
    let book = { id: Date.now(), ...req.body };
    books.push(book);
    save();
    res.status(201).json(book);
});

// PUT - Update complete book
app.put("/api/books/:id", (req, res) => {
    let i = books.findIndex(b => b.id == req.params.id);
    if (i == -1) return res.status(404).send("Book not found");

    books[i] = { id: books[i].id, ...req.body };
    save();
    res.json(books[i]);
});

// PATCH - Update selected fields
app.patch("/api/books/:id", (req, res) => {
    let book = books.find(b => b.id == req.params.id);
    if (!book) return res.status(404).send("Book not found");

    Object.assign(book, req.body);
    save();
    res.json(book);
});

// DELETE - Delete book
app.delete("/api/books/:id", (req, res) => {
    let i = books.findIndex(b => b.id == req.params.id);
    if (i == -1) return res.status(404).send("Book not found");

    let deleted = books.splice(i, 1);
    save();
    res.json(deleted[0]);
});

// HEAD
app.head("/api/books", (req, res) => {
    res.status(200).end();
});

// OPTIONS
app.options("/api/books", (req, res) => {
    res.set("Allow", "GET, POST, HEAD, OPTIONS").sendStatus(200);
});

app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "books.json");

app.use(express.json());

/* ---------- Simple JSON-file storage ---------- */

function loadBooks() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveBooks(books) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(books, null, 2));
}

let books = loadBooks();
let nextId = books.reduce((max, b) => Math.max(max, b.id), 0) + 1;

/* ---------- Helpers ---------- */

// Validates and cleans the fields title, author, category
function validateBook(body, { partial = false } = {}) {
  const errors = [];
  const clean = {};

  for (const field of ["title", "author", "category"]) {
    const value = body[field];
    if (value === undefined) {
      if (!partial) errors.push(`${field} is required`);
      continue;
    }
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`${field} must be a non-empty string`);
    } else {
      clean[field] = value.trim();
    }
  }
  return { errors, clean };
}

function findIndexById(id) {
  return books.findIndex((b) => b.id === Number(id));
}

/* ---------- Routes ---------- */

// Health / welcome
app.get("/", (req, res) => {
  res.json({
    message: "Library Management System API",
    endpoints: [
      "GET    /api/books?title=&author=&category=&page=&limit=",
      "GET    /api/books/:id",
      "POST   /api/books",
      "PUT    /api/books/:id",
      "PATCH  /api/books/:id",
      "DELETE /api/books/:id",
      "GET    /api/categories",
    ],
  });
});

// List books (with optional search + pagination)
app.get("/api/books", (req, res) => {
  const { title, author, category } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

  const includes = (value, term) =>
    value.toLowerCase().includes(String(term).toLowerCase());

  let result = books.filter(
    (b) =>
      (!title || includes(b.title, title)) &&
      (!author || includes(b.author, author)) &&
      (!category || b.category.toLowerCase() === String(category).toLowerCase())
  );

  const total = result.length;
  result = result.slice((page - 1) * limit, page * limit);

  res.json({ page, limit, total, totalPages: Math.ceil(total / limit), data: result });
});

// Get one book
app.get("/api/books/:id", (req, res) => {
  const book = books[findIndexById(req.params.id)];
  if (!book) return res.status(404).json({ error: "Book not found" });
  res.json(book);
});

// Add a book
app.post("/api/books", (req, res) => {
  const { errors, clean } = validateBook(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const duplicate = books.some(
    (b) =>
      b.title.toLowerCase() === clean.title.toLowerCase() &&
      b.author.toLowerCase() === clean.author.toLowerCase()
  );
  if (duplicate)
    return res.status(409).json({ error: "This book already exists" });

  const book = { id: nextId++, ...clean };
  books.push(book);
  saveBooks(books);
  res.status(201).json(book);
});

// Replace a book (all fields required)
app.put("/api/books/:id", (req, res) => {
  const index = findIndexById(req.params.id);
  if (index === -1) return res.status(404).json({ error: "Book not found" });

  const { errors, clean } = validateBook(req.body);
  if (errors.length) return res.status(400).json({ errors });

  books[index] = { id: books[index].id, ...clean };
  saveBooks(books);
  res.json(books[index]);
});

// Update some fields of a book
app.patch("/api/books/:id", (req, res) => {
  const index = findIndexById(req.params.id);
  if (index === -1) return res.status(404).json({ error: "Book not found" });

  const { errors, clean } = validateBook(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ errors });

  books[index] = { ...books[index], ...clean };
  saveBooks(books);
  res.json(books[index]);
});

// Delete a book
app.delete("/api/books/:id", (req, res) => {
  const index = findIndexById(req.params.id);
  if (index === -1) return res.status(404).json({ error: "Book not found" });

  const [removed] = books.splice(index, 1);
  saveBooks(books);
  res.json({ message: "Book deleted", book: removed });
});

// List unique categories
app.get("/api/categories", (req, res) => {
  const categories = [...new Set(books.map((b) => b.category))].sort();
  res.json(categories);
});

/* ---------- Error handling ---------- */

app.use((req, res) => res.status(404).json({ error: "Route not found" }));

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed")
    return res.status(400).json({ error: "Invalid JSON body" });
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () =>
  console.log(`Library API running at http://localhost:${PORT}`)
);

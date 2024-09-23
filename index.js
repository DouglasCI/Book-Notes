import express from "express";
import pg from "pg";

const app = express();
const port = 3000;
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "book_notes",
  password: "123456",
  port: 5432,
});

db.connect();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Homepage
app.get("/", async (req, res) => {
  const sort = req.query.sort;
  let result = [];

  // Choose a sorting type for the book list
  switch(sort) {
    case "title": 
      result = await db.query(`SELECT * FROM books ORDER BY ${sort} ASC`);
      break;
    case "rating":
      // fallthrough
    case "date_read":
      result = await db.query(`SELECT * FROM books ORDER BY ${sort} DESC`);
      break;
    default:
      result = await db.query("SELECT * FROM books");
  }
  res.render("index.ejs", { books: result.rows });
});

// View a book and it's notes
app.get("/book/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const book = await getBook(id);

  if(book) {
    res.render("book.ejs", { book: book });
  } else {
    errorHandler(res, "Book not found")
  }
});

// Go to add a new book
app.get("/add", (req, res) => {
  res.render("add_edit.ejs");
});

// Go to edit a book
app.get("/edit/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const book = await getBook(id);

  if(book) {
    res.render("add_edit.ejs", { book: book });
  } else {
    errorHandler(res, "Book not found")
  }
});

// Delete a book
app.get("/delete/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  await db.query(
    "DELETE FROM books WHERE id = $1", [id]
  );
  res.redirect("/");
});

// Add new book to database
app.post("/add", async (req, res) => {
  const b = req.body;

  try {
    await db.query(
      "INSERT INTO books (title, author, isbn, date_read, rating, synopsis, notes) \
      VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [b.title, b.author, b.isbn, b.date_read, b.rating, b.synopsis, b.notes]
    );
    res.redirect("/");
  } catch(err) {
    errorHandler(res, "Failed to insert into database: " + err.message)
  }
});

// Update book in database
app.post("/edit/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const b = req.body;

  try {
    await db.query(
      "UPDATE books \
      SET title=$1, author=$2, isbn=$3, date_read=$4, rating=$5, synopsis=$6, notes=$7 \
      WHERE id = $8",
      [b.title, b.author, b.isbn, b.date_read, b.rating, b.synopsis, b.notes, id]
    );
    res.redirect("/");
  } catch(err) {
    errorHandler(res, "Failed to update database: " + err.message);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


/*----------------- Auxiliary functions ----------------- */
async function getBook(id) {
  const result = await db.query(
    "SELECT * FROM books WHERE id = ($1)", [id]
  );

  return result.rows[0];
}

function errorHandler(res, message) {
  console.error(`[ERROR] ${message}.`);
  res.status(500);
  res.render("error.ejs");
}
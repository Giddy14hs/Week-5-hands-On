const express = require('express')
const app = express();
const mysql = require('mysql2')
const cors = require('cors')
const bcrypt = require('bcrypt')
const dotenv = require('dotenv')

dotenv.config()

app.use(express.json())
app.use(cors())

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

db.connect((err) => {
  if (err) {
    return console.log("Error connecting to MYSQL:", err)
  } else {
    console.log("Connected to MYSQL:", db.threadId)
  }

  //create a database
  db.query(`CREATE DATABASE IF NOT EXISTS expense_tracker`, (err, result) => {
    if (err) {
      return console.log(err)
    } else {
      console.log("Database expense_tracker created/checked successfully")
    }

    //select our database
    db.changeUser({ database: 'expense_tracker' }, (err) => {
      if (err) {
        return console.log(err)
      } else {
        console.log("Changed to expense_tracker")
      }

      //create users tables
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users(
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(100) NOT NULL UNIQUE,
          username VARCHAR(100) NOT NULL,
          password VARCHAR(255) NOT NULL
        )
      `;
      db.query(createUsersTable, (err, result) => {
        if (err) {
          return console.log(err)
        } else {
          console.log("users table checked/created");
        }
      })
    })
  })
})

//user registration route
app.post('/api/register', async (req, res) => {
  try {
    const usersQuery = `SELECT * FROM users WHERE email = ?`
    db.query(usersQuery, [req.body.email], async (err, data) => {
      if (err) {
        return res.status(500).json("Something went wrong")
      }
      if (data.length) {
        return res.status(409).json("User already exists")
      } else {
        const salt = bcrypt.genSaltSync(10)
        const hashedPassword = bcrypt.hashSync(req.body.password, salt)
        const newUserQuery = `INSERT INTO users(email, username, password) VALUES(?, ?, ?)`
        const values = [
          req.body.email,
          req.body.username,
          hashedPassword
        ]
        db.query(newUserQuery, values, (err, data) => {
          if (err) {
            return res.status(500).json("Something went wrong")
          } else {
            return res.status(200).json("User has been created successfully")
          }
        })
      }
    })
  } catch (error) {
    res.status(500).json("Internal server error")
  }
})

//user login route
app.post('./api/login', async(req, res) => {
  try {
    const usersQuery = `SELECT * FROM users WHERE email = ?`
    db.query(usersQuery, [req.body.email], (err, data) => {
      if (err) {
        console.log("Error during user lookup:", err)
        return res.status(500).json("Something went wrong")
      }
      if (data.length === 0) {
        return res.status(404).json("User Not Found")
      }
      //check if password is valid
      const isPasswordValid = bcrypt.compareSync(req.body.password, data[0].password)
        
      if (!isPasswordValid) {
        return res.status(400).json("Invalid email or password")
      } else {
        return res.status(200).json("Login Successfully")
      }
    })
  } catch (error) {
    console.log("Error during login:", error)
    res.status(500).json("Internal server error")
  }
})
app.listen(3000, () => {
  console.log("Server is running on port 3000")
})

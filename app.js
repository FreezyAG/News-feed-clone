const path = require('path');
const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const graphqlHttp = require('express-graphql');
const cors = require('cors');
// const uuidv4 = require('uuid/v4');

const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolver');
const auth = require('./middleware/auth');

const app = express();

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString().replace(/[-T:\.Z]/g, "") + '-' + file.originalname);
        // cb(null, uuidv4())
    }
});

// Filters the file from requests into filetypes
const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === 'image/png' || 
        file.mimetype === 'image/jpg' || 
        file.mimetype === 'image/jpeg'
    )   {
        cb(null, true);
    } else {
        cb(null, false);
    };
};

const MONGODB_URI = // input your MongoDB connection Url

app.use(bodyParser.json()); // application/json

// Local file storage
app.use(
    multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
)
app.use('/images', express.static(path.join(__dirname, 'images')));

// Cross-Origin Resource Sharing handler
app.use(cors());

// Setting required headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Contol-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, Accept, Content-Type, Authorization, Content-Length, X-Requested-With' );
    next();
});

// authentication middleware
app.use(auth);

app.put('/post-image', (req, res, next) => {
    if (!req.isAuth) {
        throw new Error('Not authenticated.');
    }

    if (!req.file) {
        return res.status(200).json({ message: 'No file provided!' });
    }
    if (req.body.oldPath) {
        clearImage(req.body.oldPath);
    }
    return res.status(201).json({ message: 'File stored.', filePath: req.file.path.replace("\\", "/") })
})

// Graphql connection
app.use(
    '/graphql', 
    graphqlHttp({
        schema: graphqlSchema,
        rootValue: graphqlResolver,
        graphiql: true,
        customFormatErrorFn(err) {
            if (!err.originalError) {
                return err;
            }
            const data = err.originalError.data;
            const message = err.message || 'An error occured.';
            const code = err.originalError.code || 500;
            return { message: message, status: code, data: data}
        }
    })
);

// App error handler middleware
app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data  || null;
    res.status(status).json({ message: message, data: data });
});

// Connection to mongoose
mongoose
    .connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      .then(result => {
          console.log('connected to database');
          app.listen(8080);
      })
      .catch(err => {
        console.log('connection to database failed');
      });

// Helper function to remove image from file storage when deleted
const clearImage = filePath => {
    filePath = path.join(__dirname, '.', filePath);
    fs.unlink(filePath, err => console.log(err));
}
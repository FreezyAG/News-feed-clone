const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

function errorHandler(err) {
    if (!err.statusCode) {
        err.statusCode = 500;
    };
    return err.statusCode;
}

exports.signup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed');
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }
    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;
    // console.log(email, password, name)

    try {
        const hashedPw = await bcrypt.hash(password, 12)

        const user = await new User({
            email: email,
            password: hashedPw,
            name: name
        });

        const result = await user.save()
        res.status(201).json({ message: 'User created!', userId: result._id })
    } catch (err) {
        errorHandler(err);
        next(err);
    };    
};

exports.login = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    let user;

    try {
        const user =  await User.findOne({ email: email })
            if (!user) {
                const error = new Error('A user with this email could not be found.')
                error.statusCode = 401;
                throw error;
            }

        const isEqual = await bcrypt.compare(password, user.password)
            if (!isEqual) {
                const error = new Error('Wrong Password!');
                error.statusCode = 401;
                throw error;
            }
        const token = jwt.sign(
            {
                email: user.email, 
                userId: user._id.toString()
            }, 'somesupersecretsecret',
            { expiresIn: '1h' }
        );
        res.status(200).json({ token: token, userId: user._id.toString() })
    } catch (err) {
        errorHandler(err);
        next(err);
    };
};

exports.getUserStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId)
        if (!user) {
            const error = new Error('User not found!');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({ status: user.status })
    } catch (err) {
        errorHandler(err);
        next(err);
    };
};

exports.updateUserStatus = async (req, res, next) => {
    const newStatus = req.body.status;

    try {
        const user = await User.findById(req.userId)
        if (!user) {
            const error = new Error('User not found!')
            error.statusCode = 404;
            throw error;
        }
        user.status = newStatus;
        await user.save();

        res.status(201).json({ message: 'Status updated successfully!.' })
    } catch (err) {
        errorHandler(err);
        next(err);
    };
};
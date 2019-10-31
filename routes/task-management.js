const express = require("express");
const router = express.Router();
const dotenv = require('dotenv');
dotenv.config();
var Map = require("collections/map");
const callNodeMail = require('../config/mail');
var transporter = callNodeMail;
var dateFormat = require('dateformat');

router.get('', (req, res, next) => {
    const baseTemplate = `<html>
        <head>
            <title>Task Management</title>
        </head>
        <body>
            <h2>Task Management</h2>
            <ul>
                <li>
                    <a href='/taskmanagement/newtaskreminder'>
                        Send New Task Reminder
                    </a>
                </li>
                <li>
                    <a href='/taskmanagement/duedatereminder'>
                        Send Task Due Date Reminder
                    </a>
                </li>
                <li>
                    <a href='/taskmanagement/cloneweeklytask'>
                        Clone Weekly Task
                    </a>
                </li>
            </ul>
        </body>
    </html>`;
    res.status(200).end(baseTemplate);
});

router.get('/newtaskreminder', (req, res, next) => {
    var newTaskList = new Map();
    var Airtable = require('airtable');
    var base = new Airtable({
        apiKey: process.env.AIRTABLE_API_KEY
    }).base('appfO9PMTzzFk9466');
    base('Tasks').select({
        view: "New Task Status (Do not modify)"
    }).eachPage(function page(records, fetchNextPage) {
        records.forEach(function (record) {
            var taskID = record.id;
            var subject = record.get('Subject');
            var targets = record.get('Target');
            var assignDate = record.get('Assigned Date');
            var dueDate = record.get('Due Date');
            targets.forEach(function (target) {
                var taskList = [];
                if (newTaskList.get(target)) {
                    taskList = newTaskList.get(target);
                }
                taskList.push({ "TaskID": taskID, "subject": subject, "assignDate": assignDate, "dueDate": dueDate });
                newTaskList.set(target, taskList);
            });
        });
        fetchNextPage();
    }, function done(err) {
        if (err) {
            console.error(err);
            return;
        } else {
            newTaskList.forEach(function (tasks, key) {
                var body = '<p>Below is the list of Tech4Dev tasks assigned to you.</p>';
                body += '<table border="1"><tr><td>Sr No.</td><td>Task</td><td>Assigned Date</td><td>Due Date</td></tr>';
                var index = 0;
                tasks.forEach(function (task) {
                    index++;
                    body += '<tr><td>' + index + '</td><td>' + task['subject'] + '</td><td>' + task['assignDate'] + '</td><td>' + task['dueDate'] + '</td></tr>';
                });
                body += '</table>';
                var subject = "New Task Reminder";
                sendTaskReminder(key, body, subject, base);
            });
            res.status(200).end("New task reminder sent successfully!");
        }
    });
});

router.get('/duedatereminder', (req, res, next) => {
    var newTaskList = new Map();
    var Airtable = require('airtable');
    var base = new Airtable({
        apiKey: process.env.AIRTABLE_API_KEY
    }).base('appfO9PMTzzFk9466');
    base('Tasks').select({
        view: "Overdue Task (Do not modify)"
    }).eachPage(function page(records, fetchNextPage) {
        records.forEach(function (record) {
            var taskID = record.id;
            var subject = record.get('Subject');
            var targets = record.get('Target');
            var assignDate = record.get('Assigned Date');
            var dueDate = record.get('Due Date');
            targets.forEach(function (target) {
                var taskList = [];
                if (newTaskList.get(target)) {
                    taskList = newTaskList.get(target);
                }
                taskList.push({ "TaskID": taskID, "subject": subject, "assignDate": assignDate, "dueDate": dueDate });
                newTaskList.set(target, taskList);
            });
        });
        fetchNextPage();
    }, function done(err) {
        if (err) {
            console.error(err);
            return;
        } else {
            newTaskList.forEach(function (tasks, key) {
                var body = '<p>This is a gentle reminder for the tasks which are overdue.</p>';
                body += '<table border="1"><tr><td>Sr No.</td><td>Task</td><td>Assigned Date</td><td>Due Date</td></tr>';
                var index = 0;
                tasks.forEach(function (task) {
                    index++;
                    body += '<tr><td>' + index + '</td><td>' + task['subject'] + '</td><td>' + task['assignDate'] + '</td><td>' + task['dueDate'] + '</td></tr>';
                });
                body += '</table>';
                var subject = "Task Overdue Reminder";
                sendTaskReminder(key, body, subject, base);
            });
            res.status(200).end("Overdue task reminder sent successfully!");
        }
    });
});

router.get('/cloneweeklytask', (req, res, next) => {
    var cloneTaskRecords = [];
    var Airtable = require('airtable');
    var base = new Airtable({
        apiKey: process.env.AIRTABLE_API_KEY
    }).base('appfO9PMTzzFk9466');
    base('Tasks').select({
        view: "Clone Weekly Task (Do not modify)"
    }).eachPage(function page(records, fetchNextPage) {
        records.forEach(function (record) {
            var dueDate = record.get('Due Date');
            dueDate = new Date(dueDate);
            dueDate.setDate(dueDate.getDate() + 1);
            var incrementAssignDate = 6;
            if (dueDate.getDay() == 6 || dueDate.getDay() == 7) {
                dueDate.setDate(dueDate.getDate() + 8 - dueDate.getDay());
                incrementAssignDate = 4;
            }
            var assignedDate = dueDate;
            formatedAssignedDate = new Date(assignedDate);
            formatedDueDate = formatedAssignedDate.setDate(formatedAssignedDate.getDate() + incrementAssignDate);
            assignedDate = dateFormat(assignedDate, "yyyy-mm-dd");
            formatedDueDate = dateFormat(formatedDueDate, "yyyy-mm-dd");
            var cloneRecord = {
                "fields": {
                    "Subject": record.get('Subject'),
                    "Description": record.get('Description'),
                    "Reporter": record.get('Reporter'),
                    "Target": record.get('Target'),
                    "Assigned Date": assignedDate,
                    "Due Date": formatedDueDate,
                    "Parent Task": record.get('Parent Task'),
                    "Is Weekly?": record.get('Is Weekly?')
                }
            };
            cloneTaskRecords.push(cloneRecord);
        });
        fetchNextPage();
    }, function done(err) {
        if (err) {
            console.error(err);
            return;
        } else {
            base('Tasks').create(cloneTaskRecords, function (err, records) {
                if (err) {
                    console.error(err);
                    return;
                }
                records.forEach(function (record) {
                });
            });
            res.status(200).end("Cloned successfully!");
        }
    });
});

var sendTaskReminder = function (targetID, body, subject, base) {
    base('Contacts').find(targetID, function (err, record) {
        if (err) {
            console.error(err);
            return;
        } else {
            var targetEmail = record.get('Email');
            body = "<p>Dear " + record.get('Name') + ",</p>" + body + "<p> Thanks, <br> Tech4Dev Team</p>";
            transporter("", "", targetEmail, subject, body, false);
        }
    });
}

module.exports = router;
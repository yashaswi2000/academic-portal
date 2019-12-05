const bcrypt = require('bcrypt');
const Joi = require('joi');
const express = require('express');
const router = express.Router();
const url = require('url');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
//const pg = require('pg');
const strcmp = require('strcmp');

const Pool = require('pg').Pool
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'academics',
  password: '1',
  port: 5432,
})



router.get('/', async(req,res) => {
    res.render('login');
    var name = "";
    //data = await pool.query("insert into students(entry_no,name,batch_year,dept_name) values($1,$2,$3,$4)",["17csb1089","yashaswi",2017,"computer science"]);
    data = await pool.query("select * from department");
    console.log(data.rows[0].name);
    //console.log(req.body.name);
});

router.get('/student', async(req,res) => {
    
    res.render('student',{name: req.session.username});

});

router.get('/faculty',async(req,res) => {
    res.render('faculty',{name: req.session.username});
});

router.get('/courses', async(req,res) => {
   
    data = await pool.query("select * from courses");
    res.render('courses',{datas : data.rows});
});

router.get('/offered', async(req,res) => {
    D = await pool.query("select * from semesters where status = $1",[1]);
    data = await pool.query("select * from offered_courses where year = $1 and semester = $2",[D.rows[0].year,D.rows[0].semester]);
    res.render('offered',{datas : data.rows});
});

router.get('/required', async(req,res) => {
    D = await pool.query("select * from prerequisite");
    res.render('required',{datas : D.rows});
});

router.get('/registration', async(req,res) => {
    res.render('reg');
});

router.get('/records', async(req,res) => {
    var str = "select * from transcript_"+req.session.username;
    data = await pool.query(str);
    res.render('records',{datas : data.rows});
});

router.get('/cgpa', async(req,res) => {
    D = await pool.query("call cal_CGPA($1,$2)",[req.session.username,1]);
    res.render('cgpa',{cg : D.rows[0].cgpa});
});

router.get('/addcourse', async(req,res) => {
    res.render('addcourse');
});

router.get('/addgrade', async(req,res) => {
    //A = await pool.query("select * from offered_courses where course_instructor_id = $1",[req.session.username]);
    //var data = A.rows;
    res.render('addgrade');
});

router.get('/advisor', async(req,res) => {

    A = await pool.query("select * from ticket where advisor_id=$1 and status = $2",[req.session.username,0]);
    res.render('advisor',{name : req.session.username,datas : A.rows});
});

router.get('/ticket', async(req,res) => {

    A = await pool.query("select * from ticket where student_id = $1 and course_offered_id = $2 and status = $3",[req.query.student_id,req.query.course_id,0]);
    if(A.rowCount!=0)
    {
        B = await pool.query("update ticket set status = $1 where student_id=$2 and course_offered_id=$3 and status=$4",[1,req.query.student_id,req.query.course_id,0]);
        C = await pool.query("insert into course_registrations(student_entry_no,course_offered_id,year_course,semester_course) values($1,$2,$3,$4)",[req.query.student_id,req.query.course_id,A.rows[0].year_course,A.rows[0].semester_course]);
        E = await pool.query("call total_credits($1,$2)",[req.query.course_id,1]);
        var str = "insert into transcript_" + req.query.student_id + "(course_id,course_year,course_sem,grade,credits) values($1,$2,$3,$4,$5)";
        D = await pool.query(str,[req.query.course_id,A.rows[0].year_course,A.rows[0].semester_course,0,E.rows[0].credits]);
        res.render('ticket',{name : "resolved success"});
    }
    else
    {
        res.render('ticket',{name : "resolve failed"});
    }
});
// router.get('/addgrade_student', async(req,res) => {
//     A = await pool.query("select * from course_registrations where course_offered_id = $1",[req.query.course_id]);
//     var data = A.rows;
//     res.render('addgrade_student',{datas : data});
// });

router.get('/middle', async(req,res) => {
    //var name = req.session.
    let user = await User.findOne({email : req.session.username});
    res.render('middleman',{name : user.name,email: user.email});
    console.log("gsjjzsvsvjfbv");
    //console.log(req.body.name);
});

router.get('/logout',async(req,res) => {

    req.session.destroy();
    //req.logout();
    res.redirect('/');
})


router.post('/', async (req, res) => {
    // First Validate The HTTP Request
    var password = req.body.password;
    //console.log(password);
    if(req.body.type == "student")
    {
        console.log("zsgdxhfjcg");
        user = await pool.query("select * from students where students.entry_no = $1",[req.body.email]);
        //console.log(user);
        if(user.rowCount!=0)
        {
            
            if (req.body.password!="12345") {
                return res.status(400).send('Incorrect email or password123.');
            }
            req.session.username = req.body.email;
            req.session.type = "student";
            req.session.loggedin = true;
            res.redirect('/student');
        }
        else
        {
            return res.status(400).send('Incorrect email or password123.');
        }
        
    }
    else if(req.body.type == "faculty")
    {
        user = await pool.query("select * from faculty where faculty.id = $1",[req.body.email]);
        if(user.rowCount!=0)
        {
            
        if (req.body.password!="12345") {
            return res.status(400).send('Incorrect email or password123.');
        }
        req.session.username = req.body.email;
        req.session.type = "faculty";
        req.session.loggedin = true;
        res.redirect('/faculty');
        }
        else
        {
            return res.status(400).send('Incorrect email or password123.');
        }
        
    }
    else
    {
        user = await pool.query("select * from faculty where faculty.id = $1",[req.body.email]);
        if(user.rowCount!=0)
        {
            
        if (req.body.password!="12345") {
            return res.status(400).send('Incorrect email or password123.');
        }
        req.session.username = req.body.email;
        req.session.type = "advisor";
        req.session.loggedin = true;
        res.redirect('/advisor');
        }
        else
        {
            return res.status(400).send('Incorrect email or password123.');
        }
    }
    
});

router.post('/registration', async(req,res) => {

    var student_id = req.session.username;
    var course_id = req.body.course_id;
    var num = 0;
    A = await pool.query("select * from offered_courses where course_id = $1",[course_id]);
    D = await pool.query("call can_take($1,$2,$3)",[student_id,course_id,num]);
    console.log(D.rows[0].result);
    if(D.rows[0].result == 1)
    {
        A1 = await pool.query("insert into course_registrations(student_entry_no,course_offered_id,year_course,semester_course) values($1,$2,$3,$4)",[student_id,course_id,A.rows[0].year,A.rows[0].semester]);
        C = await pool.query("call total_credits($1,$2)",[course_id,num]);
        var str = "insert into transcript_" + student_id + "(course_id,course_year,course_sem,grade,credits) values($1,$2,$3,$4,$5)";
        B = await pool.query(str,[course_id,A.rows[0].year,A.rows[0].semester,0,C.rows[0].credits]);
        return res.status(400).send('Registered successfully');
    }
    else if(D.rows[0].result == 5)
    {
            var str1 = ""+student_id + "_" + course_id + "";
            F = await pool.query("select * from students where entry_no = $1",[student_id]);
            G = await pool.query("select * from batch where year = $1 and department_name = $2",[F.rows[0].batch_year,F.rows[0].dept_name]);
            E = await pool.query("insert into ticket(ticket_id,student_id,instructor_id,advisor_id,status,current_holder,course_offered_id,year_course,semester_course) values($1,$2,$3,$4,$5,$6,$7,$8,$9)",[str1,student_id,A.rows[0].course_instructor_id,G.rows[0].advisor_id,0,"",course_id,A.rows[0].year,A.rows[0].semester]);
            return res.status(400).send('sent ticket credit limit exceded await for conformation');
    }
    else
    {
        console.log("not able");
        return res.status(400).send('unable to register for the course');
    }

});

router.post('/addcourse', async(req,res) => {
    var id = req.body.id;
    var name = req.body.name;
    var l = Number(req.body.l);
    var t = Number(req.body.t);
    var p = Number(req.body.p);
    A = await pool.query("insert into courses(id,name,l,t,p) values($1,$2,$3,$4,$5)",[id,name,l,t,p]);
    var year = Number(req.body.year);
    var semester = req.body.semester;
    var cgpa = Number(req.body.cgpa);
    var instructor = req.session.username;
    var time_slot = req.body.time_slot;
    B = await pool.query("insert into offered_courses(course_id,year,semester,cgpa_required,course_instructor_id,time_slot_id) values($1,$2,$3,$4,$5,$6)",[id,year,semester,cgpa,instructor,time_slot]);
    var prerequisites = req.body.prerequisites;
    var strings = prerequisites.split(",");
    for(var i=0;i<strings.length;i++)
    {
        C = await pool.query("insert into prerequisite(original_couse_id,prerequisite_course_id) values($1,$2)",[id,strings[i]]);
    }
    E = await pool.query("select * from faculty where id = $1",[instructor]);
    var dept = E.rows[0].department_name;
    var batches = req.body.batches_allowed;
    var batch = batches.split(",");
    for(var j=0;j<batch.length;j++)
    {
        D = await pool.query("insert into batches_allowed(course_offered_id,year_course,semester_course,batch_year,batch_dept) values($1,$2,$3,$4,$5)",[id,year,semester,batch[j],dept]);
    }
    res.redirect('/faculty');
});

router.post('/addgrade', async(req,res)=>{
    var id = req.body.id;
    var student_id = req.body.student_id;
    var cgpa = Number(req.body.cgpa);
    T = await pool.query("select * from semesters where status = $1",[1]);
    A = await pool.query("select * from offered_courses where course_id = $1 and course_instructor_id = $2 and year=$3 and semester=$4",[id,req.session.username,T.rows[0].year,T.rows[0].semester]);
    console.log("tee");
    if(A.rowCount>0)
    {
        //B = await pool.query("select * from course_registrations where student_entry_no = $1 and course_offered_id = $2 year_course=$3 and semester_course=$4",[student_id,id,T.rows[0].year,T.rows[0].semester]);
        //console.log("tee1");
        //if(B.rowCount>0)
        //{
            var str = "update "+"transcript_"+student_id+" set grade = $1 where course_id = $2 and course_year = $3 and course_sem = $4";
            C = await pool.query(str,[cgpa,id,T.rows[0].year,T.rows[0].semester]);
            res.redirect('/faculty');
        //}
    }
});


module.exports = router;
const Joi = require('joi');
const pg = require('pg');

const client = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "academics",
    password: "1",
    port: 5432
});

client.connect();
var s = "CREATE TABLE courses (id varchar(10) not null,name varchar(50) not null,l integer not null,t integer not null,p integer not null,PRIMARY KEY (id))";
client.query(s, (err,res) => {
    console.log(err,res);
});

client.query("CREATE TABLE prerequisite (original_couse_id varchar(10),prerequisite_course_id varchar(10),PRIMARY KEY (original_couse_id, prerequisite_course_id))",(err,res) => {
    console.log(err,res);
});

client.query("CREATE TABLE department (name varchar(20),PRIMARY KEY (name))",(err,res) => {
    console.log(err,res);
});

client.query("CREATE TABLE faculty (id varchar(10) not null,name varchar(50) not null,department_name varchar(20) ,FOREIGN KEY (department_name) REFERENCES department(name),PRIMARY KEY (id))",(err,res) => {
    console.log(err,res);
});

client.query("CREATE TABLE offered_courses (course_id varchar(10) not null,year integer not null,semester varchar(10) not null,cgpa_required real,course_instructor_id varchar(10),time_slot_id char(10) not null,PRIMARY KEY (course_id, year, semester),FOREIGN KEY (course_id) REFERENCES courses(id),FOREIGN KEY (course_instructor_id) REFERENCES faculty(id))",(err,res) => {
    console.log(err,res);
});

client.query("CREATE TABLE batch (year integer,advisor_id varchar(10) not null,department_name varchar(20),FOREIGN KEY (advisor_id)  REFERENCES faculty(id),FOREIGN KEY (department_name)  REFERENCES department(name),PRIMARY KEY (year, department_name))",(err,res) => {
    console.log(err,res);
});

client.query("CREATE TABLE batches_allowed (course_offered_id varchar(10) not null,year_course integer not null,semester_course varchar(10) not null,batch_year integer not null,batch_dept varchar(20) not null,FOREIGN KEY (course_offered_id, year_course, semester_course)  REFERENCES offered_courses(course_id, year, semester),FOREIGN KEY (batch_dept, batch_year)  REFERENCES batch(department_name, year),PRIMARY KEY (course_offered_id, year_course, semester_course, batch_year, batch_dept))",(err,res) => {
    console.log(err,res);
});

client.query("CREATE TABLE students ( entry_no varchar(10), name varchar(50) not null,batch_year integer not null,dept_name varchar(20) not null,FOREIGN KEY (batch_year, dept_name) REFERENCES batch(year, department_name),PRIMARY KEY (entry_no))",(err,res) => {
    console.log(err,res);
});

client.query("CREATE TABLE course_registrations (student_entry_no varchar(10),course_offered_id varchar(10) not null,year_course integer not null,semester_course varchar(10) not null,FOREIGN KEY (course_offered_id, year_course, semester_course)  REFERENCES offered_courses(course_id, year, semester),PRIMARY KEY (student_entry_no, course_offered_id, year_course, semester_course))",(err,res) => {
    console.log(err,res);
});

client.query("CREATE TABLE ticket (ticket_id varchar(10) not null,student_id varchar(10),instructor_id varchar(10) not null,advisor_id varchar(10) not null,status smallint,current_holder varchar(10),course_offered_id varchar(10) not null,year_course integer not null,semester_course varchar(10) not null,FOREIGN KEY (course_offered_id, year_course, semester_course)  REFERENCES offered_courses(course_id, year, semester),FOREIGN KEY (student_id)  REFERENCES students(entry_no),FOREIGN KEY (advisor_id)  REFERENCES faculty(id),FOREIGN KEY (instructor_id)  REFERENCES faculty(id),PRIMARY KEY (ticket_id))",(err,res) => {
    console.log(err,res);
});

client.query("CREATE TABLE semesters (year integer not null,semester varchar(10) not null,status smallint,sem_id SERIAL not null,PRIMARY KEY (sem_id) )",(err,res) => {
    console.log(err,res);
});

client.query(`
create or replace procedure total_credits(IN course_id varchar(10),OUT credits DEC(4,2))
AS
$$
DECLARE 
ll DEC(4,2);
tt DEC(4,2);
pp DEC(4,2);
BEGIN
SELECT l into ll from courses where courses.id = course_id;
SELECT t into tt from courses where courses.id = course_id;
SELECT p into pp from courses where courses.id = course_id;
credits := 0.5*pp + ll + tt;
END
$$
language plpgsql;
`);

client.query(`
create or replace procedure slot_free(IN student_id varchar(10),IN c_id varchar(10),IN y integer,IN s varchar(10),INOUT result smallint)
AS
$$
DECLARE 
tid char;
no_clashes integer;
BEGIN
select time_slot_id into tid 
from offered_courses 
where c_id = course_id and y = year and s = semester;
select count(*) into no_clashes 
from course_registrations,offered_courses 
where student_entry_no=student_id and course_offered_id = course_id and year_course=year and semester_course = semester and time_slot_id = tid and year=y and semester = s;

if no_clashes=0 then
	result = 1;
else
	result = 0;
end if;

END
$$
language plpgsql;
`);

client.query(`
CREATE or replace PROCEDURE cal_CGPA(
    IN student_id varchar(10),
    INOUT CGPA DEC(10,2))
    as
    $$
    DECLARE 
    tablename varchar(200);
    s1 varchar;
    s2 varchar;
    tot_credit DEC(30,4);
    tot DEC(100,4);
    BEGIN
    SELECT CONCAT('transcript_',student_id) into tablename;
    s1=CONCAT('select sum(credits) from ', tablename ,' where grade>4');
    execute s1 into tot_credit;
    s2=CONCAT('select sum(credits*grade) from ', tablename ,' where grade>4');
    execute s2 into tot;
    CGPA = round(tot/tot_credit,2);
    END 
    $$
    language plpgsql;
`);

client.query(`
CREATE PROCEDURE cal_creditlim(
    IN student_id varchar(10),
    INOUT credit_lim DECIMAL(4,2))
    as
    $$
    DECLARE 
    year_last integer;
    sem_last varchar(10);
    year_seclast integer;
    sem_seclast varchar(10);
    current_id integer;
    tablename varchar(200);
    s1 varchar;
    s2 varchar;
    tot_credits1 DEC(4,2);
    tot_credits2 DEC(4,2);
    BEGIN
    
    SELECT sem_id into current_id from semesters where status=1;
    
    IF current_id>=3 then
    
        SELECT year into year_last from semesters where sem_id=current_id-1;
        SELECT year into year_seclast from semesters where sem_id=current_id-2;
    
        SELECT semester into sem_last from semesters where sem_id=current_id-1;
        SELECT semester into sem_seclast from semesters where sem_id=current_id-2;
    
        credit_lim=0;
    
        SELECT CONCAT('transcript_',student_id) into tablename;
        s1=CONCAT('select sum(credits) from ', tablename ,' where grade>4 and course_year=',year_last,' and course_sem=',sem_last);
        execute s1 into tot_credits1;
        s2=CONCAT('select sum(credits) from ', tablename ,' where grade>4 and course_year=',year_seclast,' and course_sem=',sem_seclast);
        execute s2 into tot_credits2;
    
        credit_lim= round(1.25*(tot_credits1 + tot_credits2)/2,2);
    
    else
      set credit_lim=24;
    END IF;
    
    END $$
    language plpgsql;`);

    client.query(`
    CREATE  or replace PROCEDURE has_passed(
        IN student_id varchar(10),
        IN c_id varchar(10),
        INOUT result integer)
        AS
        $$
        DECLARE
        tablename varchar(200);
        s1 varchar;
        passed integer;
        BEGIN
        SELECT CONCAT('transcript_',student_id) into tablename;
        s1=CONCAT('select count(*) from ', tablename ,' where course_id=',c_id,' and grade>4');
        execute s1 into passed; 
        if passed=0 THEN
          result=1;
        else
          result=0;
        end if;
        
        END 
        $$
        language plpgsql;
    `);

    client.query(`
    CREATE or replace  PROCEDURE has_comp_preq(
        IN student_id varchar(10),
        IN c_id varchar(10),
        INOUT result integer)
        AS
        $$
        DECLARE 
        tablename varchar(200);
        s1 varchar;
        s2 varchar;
        preq_comp integer;
        preq_tot integer;
        BEGIN
        SELECT CONCAT('transcript_',student_id) into tablename;
        s1=CONCAT('select count(*) from ', tablename ,',prerequisite where prequisite_couse_id=course_id and original_couse_id=',c_id,' and grade>4');
        execute s1 into preq_comp;
        s2=CONCAT('select count(*) from prerequisite where  original_couse_id=',c_id);
        execute s2 into preq_tot;
        if preq_tot==preq_comp THEN
          result=1;
        else
          result=0;
        end if;
        
        END $$
        language plpgsql;`);

client.query(`
CREATE OR REPLACE PROCEDURE credits_taken(
    IN student_id varchar(10),
    INOUT tot_credits_taken DEC(4,2))
    AS
    $$
    DECLARE 
    y integer;
    s varchar(10);
    tablename varchar(200);
    s1 varchar;
    tot integer;
    BEGIN
    
    SELECT year into y from semesters where status=1;
    SELECT semester into s from semesters where status=1;
    
    SELECT CONCAT('transcript_',student_id) into tablename;
    s1=CONCAT('select sum(credits) from ', tablename ,' where course_year=$1 and course_sem=$2');
    execute s1 using y,s into tot;
	if tot is not null then
    tot_credits_taken=tot;
	else
		tot_credits_taken=0;
	end if;
    
    END $$
    language plpgsql;`);

client.query(`
CREATE  OR REPLACE PROCEDURE check_student_batch_allowed(
    IN ent_num varchar(10),
    IN id varchar(10),
    IN y integer,
    IN sem varchar(10),
    INOUT flag integer)
    AS
    $$
    DECLARE
    curr_batch integer;
    curr_dept  varchar;
    ctr integer;
    BEGIN
    SELECT batch_year into curr_batch from students where ent_num=entry_no;
    SELECT dept_name into curr_dept from students where ent_num=entry_no;
    SELECT COUNT(*) into ctr from batches_allowed where id=course_offered_id and y=year_course and sem=semester_course and @curr_batch=batch_year and @curr_dept=batch_dept;
    
    if ctr=0 THEN
       flag=0;
    else
       flag=1;
    end if;
    
    END $$
    language plpgsql;`);

client.query(`CREATE or REPLACE PROCEDURE can_take(
    IN student_id varchar(10),
    IN c_id varchar(10),
    INOUT result integer)
    AS
    $$
    DECLARE 
    y integer;
    s varchar(10);
    o1 integer;
    o2 integer;
    o3 integer;
    o4 integer;
    o6 integer;
    o7 integer;
	s1 varchar;
	s2 varchar;
	s3 varchar;
	s4 varchar;
	s5 varchar;
	s6 varchar;
	s7 varchar;
	s8 varchar;
    course_credits DEC(4,2);
    credit_limit DEC(4,2);
    credit_taken DEC(4,2);
    tot DEC(4,2);
    cg DEC(4,2);
    req_cg DEC(4,2);
    BEGIN
    SELECT year into y from semesters where status=1;
    SELECT semester into s from semesters where status=1;
    
    o1=0;
    s1 = 'call is_slot_free($1,$2,$3,$4,$5)';
    execute s1 using student_id,c_id,y,s,o1 into o1;
    
    o2=0;
    s2 = 'call has_comp_preq($1,$2,$3)';
    execute s2 using student_id,c_id,o2 into o2;
    
    course_credits=0;
    s3 = 'call total_credits($1,$2)';
    execute s3 using c_id,course_credits into course_credits;
	
    credit_limit=0;
    s4 = 'call cal_creditlim($1,$2)';
	execute s4 using student_id,credit_limit into credit_limit;
    
    credit_taken=0;
    s5 = 'call credits_taken($1,$2)';
	execute s5 using student_id,credit_taken into credit_taken;
    
    tot=credit_taken+course_credits;
    
    if tot<=credit_limit THEN
      o3=1;
    else
      o3=0;
    end if;
    
    cg=0;
    s6 = 'call cal_CGPA($1,$2)';
	execute s6 using student_id,cg into cg;
    
    Select cgpa_required into req_cg from offered_courses where course_id=c_id and year=y and semester=s;
    
    
    if req_cg<=cg THEN
      set o4=1;
    else
      set o4=0;
    end if;
    
    
    
    o6=0;
    s7 = 'call check_student_batch_allowed($1,$2,$3,$4,$5)';
    execute s7 using student_id,c_id,y,s,o6 into o6;
    
    o7=0;
    s8 = 'call has_passed($1,$2,$3)';
	execute s8 using student_id,c_id,o7 into o7;
    
    if ((o1==1) and (o2==1) and (o3==0) and (o4==1) and (o6==1) and (o7==1)) THEN
       result=5;
    elsif((o1==1) and (o2==1) and (o3==1) and (o4==1) and (o6==1) and (o7==1)) THEN
       result=1;
	else
	   result=0;
    end if;
    
    END 
	$$
    language plpgsql;`);

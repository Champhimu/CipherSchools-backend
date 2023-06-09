const express = require('express');
const router = express.Router();
const User = require('../model/userSchema');
const bcrypt = require('bcryptjs');
const authenticate = require('../middleware/authenticate');
const { sendError } = require('../utils/helper');

router.get('/', (req,res)=>{
    res.send('home page')
});

//check if a email or phone already exists
router.post('/checkUser',async(req,res)=>{
    const {email,phone} = req.body;

    if(email){
    const haveEmail= await User.findOne({email});
    if(haveEmail) return res.json({error: "email"});
    }
    if(phone){
    const havePhone= await User.findOne({phone});
    if(havePhone) return res.json({error: "phone"});
    }
    return res.json({msg: "ok"});
})

//validating and adding users data to DB
router.post('/register',async(req,res)=>{
    try {
        // console.log(req.body);
        //getting necessary data from user
        const {name,email,phone,gender,password} = req.body;
        let creationdate= req.body.creationdate;
        console.log(req.body);

        //checking that all required fiels are given by user
        if(!name || !email || !phone || !password || !gender){
            return res.status(422).json({error: "please fill all details"});
        }

        //check if phone and email already exists
        const haveEmail= await User.findOne({email});
        const havePhone= await User.findOne({phone});
        if(haveEmail) return res.status(422).json({error: "email"});
        if(havePhone) return res.status(422).json({error: "phone"});

        // console.log(req.body);
        //creating new user with given details
        
        if(!creationdate) creationdate= new Date().toLocaleString();
        const newUser= new User({name,email,phone,gender,password,creationdate});

        const token = await newUser.generateAuthToken();
        res.cookie('jwtoken',token,{
            expires: new Date(Date.now()+(1000*60*60)),
            httpOnly:false
        })
        console.log(token);

        await newUser.save();  //adding user to DB
        console.log(newUser);
        res.status(201).json({
            message:"User Registeration successful",
            token,
            userData: newUser
        });
    }catch (error) {
        console.log(error);
    }
});

router.post('/login',async(req,res)=>{
    try {
        //getting email and pass to variable email and password using destructuring
        const {email,password} = req.body;
        if(!email || !password) return res.json({error:"Please fill all details"});
        const checkUser= await User.findOne({email});  //check if email exists in database
        if(checkUser){
            //checking if given pass is same as stored hashed password
            const checkPass = await bcrypt.compare(password,checkUser.password);
            if(checkPass){
                const token = await checkUser.generateAuthToken();
                res.cookie('jwtoken',token,{
                    expires: new Date(Date.now()+2592000000),
                    httpOnly:false
                })
                console.log(token);
                res.status(200).json({
                    message:"Successfully logged in",
                    token,
                    userData: checkUser
                });
            }else{
                res.status(422).json({error:"Incorrect password"});
            }
        }else{
            res.status(422).json({error:"Invalid User Credentials"});
        }
    }catch (error) {
        console.log(error);
        res.status(422).json({error});
    }
});

//for contact us and home page
router.post('/getdata',authenticate, (req,res)=>{
    // console.log('my user data');
    res.send(req.rootUser);
});

//for logging out
router.post('/logout',authenticate, async(req,res)=>{
    try{
    rootUser= req.rootUser;
    tokens= rootUser.tokens;
    // console.log(tokens);
    // console.log(tokens.filter((t)=>{console.log("Tokens: ",t.token,"\nToken: ",req.token,"\n",t.token===req.token,"\n");}));
    rootUser.tokens= tokens.filter((t)=>{return t.token!==req.token});
    // res.clearCookie("jwtoken",{path:"/"});
    await rootUser.save();
    res.send({msg:"Logout successful"});
    }catch(error){
        console.log(error);
        sendError(res,"Failed to logout")
    }
});


module.exports = router;
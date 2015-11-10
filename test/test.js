/**
 * Created by Hongcai Deng on 2015/11/10.
 */

'use strict';

let Captcha = require('../index');
let fs = require('fs');

let captcha = new Captcha();

captcha.generate().then(captcha => {
    console.log(captcha.answer.toString());
    fs.writeFile('test.gif', captcha.question());
});


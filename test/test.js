/**
 * Created by Hongcai Deng on 2015/11/10.
 */

'use strict';

let Captcha = require('../index');
let fs = require('fs');

let captcha = new Captcha();

captcha.generate().then(captcha => {
    let answer = captcha.answer.toString();
    if(captcha.verify(answer)) {
        console.log('guess right!');
    }
    fs.writeFile('test.gif', captcha.question());
});


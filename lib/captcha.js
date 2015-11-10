/**
 * Created by Hongcai Deng on 2015/11/10.
 */

'use strict';

let promisify = require('bluebird').promisify;
let Crypto = require('crypto');
Crypto.randomBytes = promisify(Crypto.randomBytes);
let fonts = require('./fonts');

const GIF_SIZE = 17646;
const NDOTS = 100;
const SW = [0, 4, 8, 12, 16, 20, 23, 27, 31, 35, 39, 43, 47, 50, 54, 58, 61, 65, 68, 71, 75, 78, 81, 84, 87, 90, 93, 96, 98, 101, 103, 105, 108, 110, 112, 114, 115, 117, 119, 120, 121, 122, 123, 124, 125, 126, 126, 127, 127, 127, 127, 127, 127, 127, 126, 126, 125, 124, 123, 122, 121, 120, 119, 117, 115, 114, 112, 110, 108, 105, 103, 101, 98, 96, 93, 90, 87, 84, 81, 78, 75, 71, 68, 65, 61, 58, 54, 50, 47, 43, 39, 35, 31, 27, 23, 20, 16, 12, 8, 4, 0, -4, -8, -12, -16, -20, -23, -27, -31, -35, -39, -43, -47, -50, -54, -58, -61, -65, -68, -71, -75, -78, -81, -84, -87, -90, -93, -96, -98, -101, -103, -105, -108, -110, -112, -114, -115, -117, -119, -120, -121, -122, -123, -124, -125, -126, -126, -127, -127, -127, -127, -127, -127, -127, -126, -126, -125, -124, -123, -122, -121, -120, -119, -117, -115, -114, -112, -110, -108, -105, -103, -101, -98, -96, -93, -90, -87, -84, -81, -78, -75, -71, -68, -65, -61, -58, -54, -50, -47, -43, -39, -35, -31, -27, -23, -20, -16, -12, -8, -4];
const LETTERS = 'abcdafahijklmnopqrstuvwxyz';

function Captcha() {
    this.im = new Buffer(200 * 70).fill(0xff);
}

Captcha.prototype.generate = function () {
    return Crypto.randomBytes(5)
        .then(buf => {
            this.answer = buf;
            return Crypto.randomBytes(200);
        })
        .then(buf => {
            this.swr = buf;
            return Crypto.randomBytes(NDOTS * 4);
        })
        .then(buf => {
            this.dr = buf;
            return Crypto.randomBytes(1);
        })
        .then(buf => {
            this.s1 = buf.readUInt8(0);
            return Crypto.randomBytes(1);
        })
        .then(buf => {
            this.s2 = buf.readUInt8(0);
            return Promise.resolve();
        })
        .then(() => {
            this.s1 &= 0x7f;
            this.s2 &= 0x3f;
            this.answer[0] %= 25;
            this.answer[1] %= 25;
            this.answer[2] %= 25;
            this.answer[3] %= 25;
            this.answer[4] %= 25;
            return Promise.resolve();
        })
        .then(() => {
            let p = 30;
            p = this.letter(this.answer[0], p);
            p = this.letter(this.answer[1], p);
            p = this.letter(this.answer[2], p);
            p = this.letter(this.answer[3], p);
            this.letter(this.answer[4], p);
            this.dots();
            this.blur();
            this.filter();
            this.line();
            this.answer.write(LETTERS[this.answer[0]]);
            this.answer.write(LETTERS[this.answer[1]], 1);
            this.answer.write(LETTERS[this.answer[2]], 2);
            this.answer.write(LETTERS[this.answer[3]], 3);
            this.answer.write(LETTERS[this.answer[4]], 4);
            return Promise.resolve(this);
        });
};

Captcha.prototype.filter = function () {
    let om = new Buffer(200 * 70).fill(0xff);

    let x = 0, y = 0;
    for (let i = 0; i < 70; i++) {
        for (let j = 4; j < 200 - 4; j++) {
            if (this.im[x] > 0xf0 && this.im[x + 1] < 0xf0) {
                om[y] = om[y + 1] = 0;
            }
            else if (this.im[x] < 0xf0 && this.im[x + 1] > 0xf0) {
                om[y] = om[y + 1] = 0;
            }
            x++;
            y++;
        }
    }

    om.copy(this.im);
};

Captcha.prototype.blur = function () {
    let x = 0;
    for (let i = 0; i < 68; i++) {
        for (let j = 0; j < 198; j++) {
            let c11 = this.im[x], c12 = this.im[x + 1], c21 = this.im[x + 200], c22 = this.im[x + 201];
            this.im[x++] = Math.round(((c11 + c12 + c21 + c22) / 4));
        }
    }
};

Captcha.prototype.dots = function () {
    for (let n = 0; n < NDOTS; n++) {
        let v = this.dr.readUInt32LE(n);
        let x = v % (200 * 67);
        this.im[x] = 0xff;
        this.im[x + 1] = 0xff;
        this.im[x + 2] = 0xff;
        this.im[x + 200] = 0xff;
        this.im[x + 201] = 0xff;
        this.im[x + 202] = 0xff;
    }
};

Captcha.prototype.line = function () {
    let sk1 = this.s1;
    for (let x = 0; x < 199; x++) {
        if (sk1 >= 200) sk1 %= 200;
        let skew = Math.round(SW[sk1] / 16);
        sk1 += this.swr[x] & 0x3 + 1;
        let y = 200 * (45 + skew) + x;
        this.im[y] = 0;
        this.im[y + 1] = 0;
        this.im[y + 200] = 0;
        this.im[y + 201] = 0;
    }
};

Captcha.prototype.letter = function (n, pos) {
    let font = fonts[n];
    let im_index = 200 * 16 + pos;
    let i = im_index;
    let sk1 = this.s1 + pos;
    let sk2 = this.s2 + pos;
    let mpos = pos;
    let row = 0;
    for (let x = 0; font[x] != -101; x++) {
        if (font[x] < 0) {
            if (font[x] == -100) {
                im_index += 200;
                i = im_index;
                sk1 = this.s1 + pos;
                row++;
                continue;
            }
            i += -font[x];
        }

        if (sk1 >= 200) sk1 %= 200;
        let skew = Math.round(SW[sk1] / 16);
        sk1 += (this.swr[pos + i - im_index] & 0x1) + 1;

        if (sk2 >= 200) sk2 %= 200;
        let skewh = Math.round(SW[sk2] / 70);
        sk2 += (this.swr[row] & 0x1);

        let y = i + skew * 200 + skewh;
        mpos = Math.max(mpos, pos + i - im_index);

        if (y < 70 * 200) this.im[y] = font[x] << 4;
        i++;
    }

    return mpos;
};

Captcha.prototype.verify = function (input) {
    return input.toString() === this.answer.toString();
};

Captcha.prototype.getGIF = Captcha.prototype.question = function () {
    if (typeof this.GIF === 'undefined') {
        this.GIF = new Buffer(GIF_SIZE);
        this.GIF.write('GIF89a\xc8\0\x46\0\x83\0\0' +
            '\x00\x00\x00\x10\x10\x10\x20\x20\x20\x30\x30\x30\x40\x40\x40\x50\x50\x50' +
            '\x60\x60\x60\x70\x70\x70\x80\x80\x80\x90\x90\x90\xa0\xa0\xa0\xb0\xb0\xb0' +
            '\xc0\xc0\xc0\xd0\xd0\xd0\xe0\xe0\xe0\xff\xff\xff,\0\0\0\0\xc8\0\x46\0\0\x04', 0, 13 + 48 + 10 + 1, 'ascii');

        let i = 0;
        let p = 13 + 48 + 10 + 1;
        for (let y = 0; y < 70; y++) {
            this.GIF[p] = 250;
            p++;
            for (let x = 0; x < 50; x++) {
                let a = this.im[i] >> 4, b = this.im[i + 1] >> 4, c = this.im[i + 2] >> 4, d = this.im[i + 3] >> 4;

                this.GIF[p] = 16 | (a << 5);
                this.GIF[p + 1] = (a >> 3) | 64 | (b << 7);
                this.GIF[p + 2] = b >> 1;
                this.GIF[p + 3] = 1 | (c << 1);
                this.GIF[p + 4] = 4 | (d << 3);
                i += 4;
                p += 5;
            }
        }

        this.GIF.write('\x01\x11\x00;', GIF_SIZE - 4, 4, 'ascii');
    }
    return this.GIF;
};

module.exports = Captcha;
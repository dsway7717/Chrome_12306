/**
 * @file 验证码
 * @date 2015-12-22
 */
var 
    utils = require('common/utils'),
    EventEmitter = require('lib/EventEmitter'),
    recognize = require('./recognize');

function Checkcode(opt) {
    this.$ele = opt.$ele;
    this.type = opt.type || 'login';
    this.forBtn = opt.forBtn || null;

    this.waiting = false; // 急需输入验证码

    this.$ele.html([
        '<img class="checkcode" />',
        '<div class="checkcode-new"></div>',
        '<div class="checkcode-click"></div>'
    ].join(''));

    this.$img = this.$ele.find('img');
    this.$ele
        .addClass('checkcode-' + this.type)
        .data('_checkcode', this);
    bind.call(this);
    recognize.bind(this);
};

var p = Checkcode.prototype;

p.__proto__ = EventEmitter.prototype;

function bind() {
    this.$img.bind('load', this._onload.bind(this));
    this.$ele.find('.checkcode-new').click(this.refresh.bind(this));
    this.$ele.find('.checkcode-click')
        .click((e) => {
            if (e.currentTarget === e.target) {
                this._addValue(e.offsetX, e.offsetY);
            }
            this._lastChange = Date.now();
        })
        .bind('contextmenu', (e) => {
            e.preventDefault();
            if (this._lastChange) {
                this.submit();
                this._lastChange = 0;
            }
        });

    this.$ele.on('click', '.checkcode-select', (e) => {
        e.preventDefault();
        e.stopPropagation();
        $(e.currentTarget).remove();
    });

    this.on('recognize_succ', (result) => {
        this.setValue(result);
        this.submit();
    });

    this.on('recognize_err', (src) => {
        var t = Date.now();
        setTimeout(
            () => {
                src === this.src && this.refresh();
            },
            Math.max(
                0, 
                // 错误最小间隔
                1500 + (this._lastRecErr || 0) - t, 
                // 用户手动输验证码
                7000 + (this._lastChange || 0) - t
            )
        );
        this._lastRecErr = Date.now();
    });

    this.forBtn && $(this.forBtn).click(() => {
        // 提交一次之后验证码就失效了
        this.src = null;
    });
};

p.submit = function() {
    this.forBtn && $(this.forBtn).trigger('click');
};

p._addValue = function(x, y) {
    var radius = 15;
    $('<div class="checkcode-select"></div>')
        .css({
            position: 'absoulte',
            left: x - radius,
            top: y - radius
        })
        .data({
            x: x,
            y: y
        })
        .appendTo(this.$ele.find('.checkcode-click'));
};

p.refresh = function(_waiting) {
    this.waiting = _waiting || false;
    this._base64 = null;
    this.setValue([]);
    this.$ele.find('.checkcode-select').remove();
    this.$ele.removeClass('loading loaded').addClass('loading');
    var url = 'https://kyfw.12306.cn/otn/passcodeNew/getPassCodeNew?'
            + (this.type === 'login' ? 'module=login&rand=sjrand' : 'module=passenger&rand=randp')
            + '&' + Math.random();
    this.src = this.$img[0].src = url;
    // load timeout
    setTimeout(() => {
        if (this.$img.src === url && this.$img.hasClass('loading')) {
            this.refresh();
        }
    }, 5000);
};

p.finish = function() {
    this.waiting = false;
};

p.getValue = function() {
    var val = [];
    this.$ele.find('.checkcode-select').each((i, ele) => {
        var $ele = $(ele);
        val.push($ele.data('x'));
        val.push($ele.data('y'));
    });
    return val;
};

p._onload = function() {
    if (this.$img[0].src.indexOf('http') !== -1) {
        this.$ele.removeClass('loading loaded').addClass('loaded');
        var cvs = document.createElement('canvas'),
            img = this.$img[0];
        cvs.width = img.width;
        cvs.height = img.height;
        cvs.getContext('2d').drawImage(img, 0, 0);
        this._base64 = cvs.toDataURL();
        this.emit('load');
    }
};

p.setValue = function(value) {
    this.$ele.find('.checkcode-select').remove();
    for (var i = 0; i < value.length; i += 2) {
        this._addValue(value[i], value[i + 1]);
    }
};

p.toBase64 = function() {
    return this._base64 || null;
};

Checkcode.getByType = function(type) {
    return $('.checkcode-' + type).data('_checkcode') || null;
};

module.exports = Checkcode;


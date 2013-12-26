/**
 * DarkDOM 
 * Design your markup language on a higher level of abstraction than HTML
 * Build responsive cross-screen UI components
 * Better separation of concerns
 * Separate the presentation layer and business layer from the traditional content layer
 *
 * using AMD (Asynchronous Module Definition) API with OzJS
 * see http://ozjs.org for details
 *
 * Copyright (C) 2013-2014, Dexter.Yy, MIT License
 * vim: et:ts=4:sw=4:sts=4
 */
define([
    'mo/lang/es5',
    'mo/lang/mix',
    'dollar'
], function(es5, _, $){

var _defaults = {
        unique: false,
        enableSource: false,
        disableScript: false,
        entireAsContent: false,
        render: false
    },
    _default_attrs = {
        source: 'source-selector'
    },
    _content_buffer = {},
    _sourcedata = {},
    _darkdata = {},
    _guards = {},
    _updaters = {},
    _tm = 0,
    _tuid = 0,
    _to_string = Object.prototype.toString,
    _matches_selector = $.find.matchesSelector,
    IS_BRIGHT = 'dd-autogen',
    MY_BRIGHT = 'dd-connect',
    ID_PREFIX = '_brightRoot_',
    RE_CONTENT_COM = new RegExp('\\{\\{' 
        + MY_BRIGHT + '=(\\w+)\\}\\}', 'g'),
    RE_EVENT_SEL = /(\S+)\s*(.*)/,
    RE_HTMLTAG = /^\s*<(\w+|!)[^>]*>/;

var dom_ext = {

    mountDarkDOM: function(){
        var me = $(this),
            guard = _guards[me.attr(MY_BRIGHT)];
        if (guard) {
            guard.mountRoot(me);
        }
    },

    unmountDarkDOM: function(){
        var me = $(this),
            guard = _guards[me.attr(MY_BRIGHT)];
        if (guard) {
            guard.unmountRoot(me);
        }
    },

    updateDarkDOM: function(){
        update_target(this);
        exports.DarkGuard.gc();
    },

    feedDarkDOM: function(fn){
        var bright_id = $(this).attr(MY_BRIGHT),
            guard = _guards[bright_id];
        if (guard) {
            var user_data = is_function(fn) 
                ? fn(_sourcedata[bright_id]) : fn;
            fix_userdata(user_data, guard);
            _sourcedata[bright_id] = user_data;
        }
    },

    responseDarkDOM: function(subject, handler){
        var target = $(this),
            bright_id = target.attr(MY_BRIGHT),
            updaters = _updaters[bright_id];
        if (!updaters) {
            updaters = _updaters[bright_id] = {};
        }
        updaters[subject] = handler;
    }

};

function DarkDOM(opt){
    opt = opt || {};
    this._config = _.config({}, opt, _defaults);
    this._attrs = _.mix({}, _default_attrs);
    this._components = {};
    this._contents = {};
    this._updaters = {};
    this._events = {};
    this.set(this._config);
}

DarkDOM.prototype = {

    set: function(opt){
        if (!opt) {
            return this;
        }
        _.config(this._config, opt, this._defaults);
        return this;
    },

    bond: function(attr, elem_attr){
        mix_setter(attr, elem_attr, this._attrs);
        return this;
    },

    contain: function(name, component, opt){
        if (typeof name === 'object') {
            opt = component;
        }
        opt = opt || {};
        var dict = mix_setter(name, component, this._components, {
            execFunc: true
        });
        if (opt.content) {
            _.mix(this._contents, dict);
        }
        return this;
    },

    forward: function(selector, subject){
        mix_setter(selector, subject, this._events);
        return this;
    },

    response: function(subject, handler){
        this._updaters[subject] = handler;
        return this;
    },

    component: function(name){
        return this._components[name];
    },

    createGuard: function(opt){
        return new exports.DarkGuard(_.mix({
            attrs: this._attrs,
            components: this._components,
            contents: this._contents,
            updaters: this._updaters,
            events: this._events,
            options: this._config
        }, opt));
    }

};

function DarkGuard(opt){
    this._attrs = Object.create(opt.attrs);
    this._options = opt.options;
    this._config = _.mix({}, opt);
    this._darkRoots = [];
    this._specs = {};
    this._buffer = [];
    this._events = {};
    this._sourceGuard = null;
    if (this._options.enableSource) {
        this.createSource(opt);
    }
}

DarkGuard.prototype = {

    bond: function(attr, elem_attr){
        mix_setter(attr, elem_attr, this._attrs);
        return this;
    },

    component: function(name, spec){
        mix_setter(name, spec, this._specs);
        return this;
    },

    forward: function(subject, selector){
        mix_setter(subject, selector, this._events);
        return this;
    },

    source: function(){
        if (!this._options.enableSource) {
            return;
        }
        return this._sourceGuard;
    },

    watch: function(targets){
        if (this._darkRoots.length > 0) {
            return this;
        }
        targets = $(targets, this._config.contextTarget);
        if (this._options.unique) {
            targets = targets.eq(0);
        }
        targets.forEach(this.registerRoot, this);
        return this;
    },

    unwatch: function(targets){
        targets = targets 
            ? $(targets, this._config.contextTarget) 
            : this._darkRoots;
        targets.forEach(this.unregisterRoot, this);
        return this;
    },

    mount: function(){
        this._darkRoots.forEach(this.mountRoot, this);
        return this;
    },

    unmount: function(){
        this._darkRoots.forEach(this.unmountRoot, this);
        return this;
    },

    buffer: function(){
        this._darkRoots.forEach(this.bufferRoot, this);
        return this;
    },

    update: function(){
        this._darkRoots.forEach(this.updateRoot, this);
        return this;
    },

    registerRoot: function(target){
        target = $(target);
        if (target.attr(IS_BRIGHT)) {
            return;
        }
        var bright_id = target.attr(MY_BRIGHT);
        if (!bright_id) {
            bright_id = uuid();
            if (!this._config.isSource) {
                target.attr(MY_BRIGHT, bright_id);
            }
        }
        _guards[bright_id] = this;
        _.each(dom_ext, function(method, name){
            this[name] = method;
        }, target[0]);
        this._darkRoots.push(target[0]);
        return bright_id;
    },

    unregisterRoot: function(target){
        target = $(target);
        var bright_id = target.attr(MY_BRIGHT);
        if (this !== _guards[bright_id]) {
            return;
        }
        target.removeAttr(MY_BRIGHT);
        unregister(bright_id);
        _.each(dom_ext, function(method, name){
            delete this[name];
        }, target[0]);
        var i = this._darkRoots.indexOf(target[0]);
        if (i !== -1) {
            this._darkRoots.splice(i, 1);
        }
    },

    mountRoot: function(target){
        target = $(target);
        if (target.attr(IS_BRIGHT)
                || target[0].isMountedDarkDOM) {
            return this;
        }
        var data = render_root(this.scanRoot(target));
        target.hide().before(this.createRoot(data));
        target[0].isMountedDarkDOM = true;
        run_script(data);
        target.trigger('darkdom:mounted')
            .trigger('darkdom:updated');
        return this;
    },

    unmountRoot: function(target){
        target = $(target);
        var bright_id = target.attr(MY_BRIGHT);
        $('#' + bright_id).remove();
        delete _darkdata[bright_id];
    },

    bufferRoot: function(target){
        target = $(target);
        if (target.attr(IS_BRIGHT)) {
            return this;
        }
        var data = this.scanRoot(target); 
        this._bufferData(data);
        target[0].isMountedDarkDOM = true;
        return this;
    },

    updateRoot: function(target){
        $(target).updateDarkDOM();
        return this;
    },

    scanRoot: function(target){
        var is_source = this._config.isSource;
        var bright_id = this.registerRoot(target);
        var data = {
            id: bright_id,
        };
        if (!is_source) {
            data.context = this._config.contextData;
        }
        data.state = {};
        _.each(this._attrs, function(getter, name){
            this[name] = read_state(target, getter);
        }, data.state);
        this._scanComponents(data, target);
        if (!is_source
                && this._sourceGuard) {
            this._mergeSource(data);
        }
        return data;
    },

    _scanComponents: function(data, target){
        var re = {};
        _.each(this._config.components, function(component, name){
            var guard = component.createGuard({
                contextData: data,
                contextTarget: target,
                isSource: this._config.isSource
            });
            var spec = this._specs[name];
            if (typeof spec === 'string') {
                guard.watch(spec);
            } else if (spec) {
                spec(guard);
            }
            guard.buffer();
            if (this._config.contents[name]) {
                guard._bufferContent();
            } else {
                re[name] = guard.releaseData();
            }
        }, this);
        data.componentData = re;
        data.contentData = this._scanContents(target, {
            scriptContext: !this._options.disableScript && target[0],
            entireAsContent: this._options.entireAsContent,
            noComs: !Object.keys(this._config.components).length
        });
    },

    _scanContents: scan_contents,

    renderBuffer: function(){
        this._buffer.forEach(function(data){
            render_root(data);
        });
        return this;
    },

    releaseData: function(){
        var re = this._buffer.slice();
        if (this._options.unique) {
            re = re[0] || {};
        }
        this._resetBuffer();
        return re;
    },

    _bufferData: function(data){
        this._buffer.push(data);
    },

    _bufferContent: function(){
        this._buffer.forEach(function(data){
            _content_buffer[data.id] = data;
        }, this);
        this._resetBuffer();
    },

    _resetBuffer: function(){
        this._buffer.length = 0;
        return this;
    },

    createRoot: function(data){
        var html = this.render(data);
        if (!RE_HTMLTAG.test(html)) {
            return html;
        }
        var bright_root = $(html);
        bright_root.attr(IS_BRIGHT, 'true');
        bright_root.attr('id', data.id);
        this.registerEvents(bright_root);
        return bright_root;
    },

    render: function(data){
        return (this._options.render
            || default_render)(data);
    },

    triggerUpdate: function(changes){
        var handler;
        var subject = changes.type;
        var updaters = _updaters[changes.rootId] 
            || this._config.updaters;
        if (changes.name) {
            subject += ':' + changes.name;
            handler = updaters[subject];
        }
        if (!handler) {
            handler = updaters[changes.type];
        }
        if (!handler) {
            handler = this.defaultUpdater;
        }
        return handler.call(this, changes);
    },

    defaultUpdater: function(changes){
        var re = false;
        if (!changes.data) {
            changes.root.remove();
            return re;
        }
        if (changes.root[0]) {
            this.createRoot(changes.data).replaceAll(changes.root);
            return re;
        }
    },

    registerEvents: function(bright_root){
        var self = this;
        var dark_root = $('[' + MY_BRIGHT + '="' 
            + bright_root.attr('id') + '"]');
        _.each(this._config.events, function(subject, bright_sel){
            bright_sel = RE_EVENT_SEL.exec(bright_sel);
            this.on(bright_sel[1], function(e){
                if (_matches_selector(e.target, bright_sel[2])) {
                    self.triggerEvent(dark_root, subject, e);
                }
                return false;
            });
        }, bright_root);
    },

    triggerEvent: function(target, subject, e){
        var dark_sel = this._events[subject];
        if (!dark_sel) {
            return;
        }
        if (typeof dark_sel !== 'string') {
            return dark_sel(e, target);
        }
        dark_sel = RE_EVENT_SEL.exec(dark_sel);
        if (dark_sel[2]) {
            target = target.find(dark_sel[2]);
        }
        target.trigger(dark_sel[1], {
            sourceEvent: e
        });
    },

    createSource: function(opt){
        this._sourceGuard = new exports.DarkGuard(_.merge({
            isSource: true,
            contextTarget: null,
            options: _.merge({
                enableSource: false 
            }, opt.options)
        }, opt));
        return this._sourceGuard;
    },

    scanSource: function(bright_id, selector){
        if (!selector) {
            return;
        }
        var guard = this._sourceGuard;
        guard.watch(selector);
        guard.buffer();
        var dataset = guard.releaseData();
        _sourcedata[bright_id] = dataset;
        return dataset;
    },

    _mergeSource: function(data){
        var source_dataset = _sourcedata[data.id];
        if (!source_dataset) {
            source_dataset = this.scanSource(data.id, 
                data.state.source);
        }
        if (source_dataset) {
            merge_source(data, source_dataset, data.context);
        }
    }

};

DarkGuard.gc = function(){
    var current = {};
    $('[' + MY_BRIGHT + ']').forEach(function(target){
        this[$(target).attr(MY_BRIGHT)] = true;
    }, current);
    Object.keys(_guards).forEach(function(bright_id){
        if (!this[bright_id]) {
            unregister(bright_id);
        }
    }, current);
};

init_plugins($);

function init_plugins($){
    _.each(dom_ext, function(method, name){
        this[name] = function(){
            _.each(this, function(target){
                method.apply(target, this);
            }, arguments);
            return this;
        };
    }, $.fn);
}

function uuid(){
    var now = +new Date();
    if (now > _tm) {
        _tm = now;
        _tuid = 0;
    }
    return ID_PREFIX + _tm + '_' + (++_tuid);
}

function unregister(bright_id){
    delete _guards[bright_id];
    delete _darkdata[bright_id];
    delete _sourcedata[bright_id];
    delete _updaters[bright_id];
}

function scan_contents(target, opt){
    opt = opt || {};
    var data = { 
        text: '',
        _index: {},
        _script: '',
        _context: opt.scriptContext,
        _hasOuter: opt.entireAsContent
    };
    if (!target) {
        return data;
    }
    opt.data = data;
    if (data._hasOuter) {
        content_spider.call(opt, 
            target.clone().removeAttr(MY_BRIGHT));
    } else {
        target.contents().forEach(content_spider, opt);
    }
    return data;
}

function content_spider(content){
    var data = this.data;
    content = $(content);
    if (content[0].nodeType !== 1) {
        if (content[0].nodeType === 3) {
            content = content.text();
            if (/\S/.test(content)) {
                data.text += content;
            }
        }
        return;
    } else if (data._context
            && content[0].nodeName === 'SCRIPT'
            && content.attr('type') === 'text/darkscript') {
        data._script += content[0].innerHTML;
        return;
    }
    var mark = content[0].isMountedDarkDOM;
    if (this.noComs 
            && (!this.scriptContext
                || !content.find('script').length)) {
        if (!mark) {
            data.text += content[0].outerHTML || '';
        }
        return;
    }
    var buffer_id = content.attr(MY_BRIGHT),
        buffer = _content_buffer[buffer_id];
    delete _content_buffer[buffer_id];
    if (buffer) {
        data._index[buffer_id] = buffer;
        data.text += '{{' + MY_BRIGHT + '=' + buffer_id + '}}';
    } else if (!mark) {
        var childs_data = scan_contents(content);
        data.text += content.clone()
            .html(childs_data.text)[0].outerHTML || '';
        _.mix(data._index, childs_data._index);
    }
}

function run_script(data){
    if (typeof data !== 'object') {
        return;
    }
    var content = data.contentData || {};
    if (content._script) {
        new Function('', content._script)
            .call(content._context);
    }
    _.each(content._index || {}, run_script);
    _.each(data.componentData || [], run_script);
}

function update_target(target){
    target = $(target);
    var bright_id = target.attr(MY_BRIGHT);
    if (!target.parent()[0]) {
        return trigger_update(bright_id, null, {
            type: 'remove'
        });
    }
    var guard = _guards[bright_id];
    var origin = _darkdata[bright_id];
    if (!guard || !origin) {
        return;
    }
    var dataset = guard.bufferRoot(target)
        .renderBuffer()
        .releaseData();
    compare_model(origin, 
        Array.isArray(dataset) ? dataset[0] : dataset);
}

function compare_model(origin, data){
    if (!data || !data.id) {
        return trigger_update(origin.id, null, {
            type: 'remove'
        });
    }
    if (!origin.id) {
        data = data.context;
        return trigger_update(data.id, data, {
            type: 'component'
        });
    }
    var abort;
    _.each(data.state, function(value, name){
        if (this[name] != value) {
            abort = trigger_update(data.id, data, {
                type: 'state',
                name: name,
                oldValue: this[name],
                newValue: value
            });
            if (abort === false) {
                return false;
            }
        }
    }, origin.state || (origin.state = {}));
    if (abort === false) {
        return;
    }
    if (compare_contents(
        origin.contentData 
            || (origin.contentData = scan_contents()), 
        data.contentData
    )) {
        abort = trigger_update(data.id, data, {
            type: 'content',
            oldValue: origin.content,
            newValue: data.content
        });
        if (abort === false) {
            return;
        }
    }
    _.each(data.componentData, function(dataset, name){
        var changed = compare_components.apply(this, arguments);
        if (changed) {
            abort = trigger_update(data.id, data, {
                type: 'component',
                name: name,
                oldValue: this[name],
                newValue: dataset
            });
            if (abort === false) {
                return false;
            }
        }
    }, origin.componentData || (origin.componentData = {}));
}

function compare_contents(origin, data){
    if (origin.text.length !== data.text.length) {
        return true;
    }
    var changed;
    _.each(data._index || {}, function(data, bright_id){
        if (!this[bright_id]) {
            changed = true;
            return false;
        }
        compare_model(this[bright_id], data);
    }, origin._index);
    return changed || (origin.text !== data.text);
}

function compare_components(dataset, name){
    if (!Array.isArray(dataset)) {
        compare_model(this[name] || (this[name] = {}), 
            dataset);
        return;
    }
    var changed;
    var originset = this[name] || (this[name] = []);
    var larger = originset.length < dataset.length 
        ? dataset
        : originset;
    for (var i = 0, l = larger.length; i < l; i++) {
        if (!originset[i]) {
            changed = true;
            break;
        }
        if (!dataset[i] 
                || originset[i].id === dataset[i].id) {
            compare_model(originset[i], dataset[i]);
        } else {
            changed = true;
            break;
        }
    }
    return changed;
}

function trigger_update(bright_id, data, changes){
    if (!bright_id) {
        return;
    }
    var re;
    var bright_root = $('#' + bright_id);
    var guard = _guards[bright_id];
    if (guard) {
        re = guard.triggerUpdate(_.mix(changes, {
            data: data,
            root: bright_root,
            rootId: bright_id
        }));
    } else if (!data) {
        bright_root.remove();
        re = false;
    }
    var dark_root = $('[' + MY_BRIGHT + '="' + bright_id + '"]');
    if (!data || changes.type === "remove") {
        dark_root.trigger('darkdom:removed');
    } else if (re === false) {
        dark_root.trigger('darkdom:updated');
    }
    return re;
}

function merge_source(data, source_data, context){
    if (Array.isArray(source_data)) {
        source_data.forEach(function(source_data){
            merge_source(this, source_data, context);
        }, data);
        return data;
    }
    if (!data.id) {
        data.id = source_data.id;
    }
    data.context = context;
    _.each(source_data.state || {}, function(value, name){
        if (this[name] === undefined) {
            this[name] = value;
        }
    }, data.state || (data.state = {}));
    // @note
    var content = data.contentData 
        || (data.contentData = scan_contents());
    var source_content = source_data.contentData;
    if (source_content && source_content.text
            && (!content.text 
                || source_content._hasOuter)) {
        content.text = source_content.text; 
        _.mix(content._index, source_content._index);
    }
    // @note
    if (!data.componentData) {
        data.componentData = {};
    }
    _.each(source_data.componentData || [],
        merge_source_components, data);
    return data;
}

function merge_source_components(dataset, name){
    var origin = this.componentData;
    if (Array.isArray(dataset)) {
        dataset.forEach(function(source_data){
            this.push(source_data);
        }, origin[name] || (origin[name] = []));
    } else {
        merge_source(origin[name] || (origin[name] = {}),
            dataset, this);
    }
}

function fix_userdata(data, guard){
    if (!data.id) {
        data.id = uuid();
        _guards[data.id] = guard;
    }
    if (data.componentData) {
        _.each(guard._config.components, 
            fix_userdata_component, 
            data.componentData);
    }
    if (data.contentData) {
        data.contentData._hasOuter = guard._options.entireAsContent;
    }
}

function fix_userdata_component(component, name){
    var dataset = this[name];
    if (!dataset) {
        return;
    }
    if (!Array.isArray(dataset)) {
        dataset = [dataset];
    }
    dataset.forEach(function(data){
        fix_userdata(data, this.createGuard({
            isSource: true
        }));
    }, component);
}

function render_root(data){
    _.each(data.componentData, function(dataset, name){
        if (Array.isArray(dataset)) {
            this[name] = dataset.map(function(data){
                return render_data(data);
            });
        } else {
            this[name] = render_data(dataset);
        }
    }, data.component || (data.component = {}));
    var content_data = data.contentData;
    data.content = content_data.text
        .replace(RE_CONTENT_COM, function($0, bright_id){
            var data = content_data._index[bright_id];
            if (data === 'string') {
                return data;
            }
            return render_data(data);
        });
    _darkdata[data.id] = data;
    return data;
}

function render_data(data){
    var guard = _guards[data.id];
    if (!guard) {
        return '';
    }
    if (!data.component) {
        data = render_root(data);
    }
    var root = guard.createRoot(data);
    return typeof root === 'string' 
        ? root
        : root[0].outerHTML;
}

function read_state(target, getter){
    return (typeof getter === 'string' 
        ? target.attr(getter) 
        : getter && getter(target)) || undefined;
}

function default_render(data){
    return '<span>' + data.content + '</span>';
}

function is_function(obj) {
    return _to_string.call(obj) === "[object Function]";
}

function mix_setter(key, value, context, opt){
    opt = opt || {};
    var dict = key;
    if (typeof dict !== 'object') {
        dict = {};
        dict[key] = value;
    }
    var re = {};
    _.each(dict, function(value, key){
        if (opt.execFunc && is_function(value)) {
            value = value(this[key]);
        }
        this[key] = re[key] = value;
    }, context);
    return re;
}

function exports(opt){
    return new exports.DarkDOM(opt);
}

exports.DarkDOM = DarkDOM;
exports.DarkGuard = DarkGuard;
exports.gc = DarkGuard.gc;
exports.initPlugins = init_plugins;

return exports;

});

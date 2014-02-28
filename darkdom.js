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

/**
 * @module darkdom
 */
define('darkdom', [
    'mo/lang/es5',
    'mo/lang/mix',
    'dollar'
], function(es5, _, $){

var _defaults = {
        unique: false,
        enableSource: false,
        disableScript: false,
        entireAsContent: false,
        sourceAsContent: false,
        render: false
    },
    _default_states = {
        source: 'source-selector'
    },
    _content_buffer = {},
    _source_models = {},
    _dark_models = {},
    _guards = {},
    _updaters = {},
    _tm = 0,
    _tuid = 0,
    _to_string = Object.prototype.toString,
    _is_array = Array.isArray,
    _matches_selector = $.find.matchesSelector,
    IS_BRIGHT = 'dd-autogen',
    MY_BRIGHT = 'dd-connect',
    ID_PREFIX = '_brightRoot_',
    RE_CONTENT_COM = new RegExp('\\{\\{' 
        + MY_BRIGHT + '=(\\w+)\\}\\}', 'g'),
    RE_EVENT_SEL = /(\S+)\s*(.*)/,
    RE_HTMLTAG = /^\s*<(\w+|!)[^>]*>/;

/**
 * @memberof module:darkdom
 * @alias DarkDOM
 * @class
 *
 * @desc Mixin class
 *
 * @see module:darkdom.DarkGuard#watch}
 * @see module:darkdom.initPlugins}
 *
 * @example 
 * $('x-folder').attr({
 *     mode: 'unfold'
 * }).updateDarkDOM();
 * // or $('x-folder')[0].updateDarkDOM();
 */
function DarkDOM(){}

DarkDOM.prototype = {

    /**
     * @method
     * @returns {DarkGuard} 
     */
    darkGuard: function(){
        return _guards[this.getAttribute(MY_BRIGHT)];
    },

    /**
     * @method
     * @see module:darkdom.DarkGuard#mount
     * @see module:darkdom.DarkGuard#mountRoot
     */
    mountDarkDOM: function(){
        var guard = this.darkGuard();
        if (guard) {
            guard.mountRoot(this);
        }
    },

    /**
     * @method
     * @see module:darkdom.DarkGuard#unmount
     * @see module:darkdom.DarkGuard#unmountRoot
     */
    unmountDarkDOM: function(){
        var guard = this.darkGuard();
        if (guard) {
            guard.unmountRoot(this);
        }
    },

    /**
     * [Unmount]{@link 
     * module:darkdom.DarkDOM#unmountDarkDOM} & [deregister]{@link 
     * module:darkdom.DarkGuard#unregisterRoot}
     *
     * @method
     * @see module:darkdom.DarkGuard#unmount
     * @see module:darkdom.DarkGuard#unwatch
     * @see module:darkdom.DarkGuard#unmountRoot
     * @see module:darkdom.DarkGuard#unregisterRoot
     */
    resetDarkDOM: function(){
        var guard = this.darkGuard();
        if (guard) {
            guard.unmountRoot(this);
            guard.unregisterRoot(this);
        }
    },

    /**
     * @example
     * var component = darkdom({ render: function(){} });
     *
     * var guard_A = component.createGuard();
     * guard_A.watch('x-folder');
     * guard_A.state('isFolded', 'data-folded');
     *
     * var guard_B = component.createGuard();
     * guard_B.watch('.x-folder');
     * guard_B.state('isFolded', function(node){
     *     return node.hasClass('folded');
     * });
     *
     * console.log($('x-folder').data('folded')); // (A1)
     * console.log($('x-folder').getDarkState('isFolded')); // (A1)
     *
     * console.log($('.x-folder').hasClass('folded')); // (B1)
     * console.log( // (B2)
     *     $('.x-folder').darkGuard().stateGetter('isFolded')(
     *         $('.x-folder')
     *     )
     * );
     * console.log($('.x-folder').getDarkState('isFolded')); // (B3)
     *
     * @method
     * @param {String} name - 
     * @see module:darkdom.DarkComponent#state
     * @see module:darkdom.DarkGuard#state
     */
    getDarkState: function(name){
        var guard = this.darkGuard();
        return guard
            && read_state($(this), guard.stateGetter(name))
            || null;
    },

    /**
     * @method
     * @param {String} name - 
     * @param {String|Function} value - 
     * @param {String} opt - 
     * @see module:darkdom.DarkDOM#getDarkState
     */
    setDarkState: function(name, value, opt){
        opt = opt || {};
        var guard = this.darkGuard();
        if (guard) {
            var setter = guard.stateSetter(name);
            write_state($(this), setter, value);
            if (opt.update) {
                this.updateDarkStates();
            }
        }
    },

    /**
     * High-performance version of [DarkDOM#updateDarkDOM]{@link 
     * module:darkdom.DarkDOM#updateDarkDOM}
     *
     * @method
     */
    updateDarkStates: function(){
        update_target(this, {
            onlyStates: true
        });
    },

    /**
     * @method
     */
    updateDarkDOM: function(){
        update_target(this, {});
        exports.DarkGuard.gc();
    },

    /**
     * @example <caption>HTML(Jade syntax)</caption>
     * x-folder(mode="unfold")
     *   hd(source-selector=".source-data h1")
     * div(class="source-data")
     *   h1 The header A
     *
     * @example <caption>JS</caption>
     * $('x-folder').attr({
     *     mode: 'fold'
     * }).find('hd').feedDarkDOM({
     *     state: {
     *         label: 'The header B'
     *     }
     * }).end().updateDarkDOM();
     *
     * @method
     * @param {Function} fn - accepts {@link SourceModel}
     */
    feedDarkDOM: function(fn){
        var bright_id = $(this).attr(MY_BRIGHT),
            guard = _guards[bright_id];
        if (!guard) {
            return;
        }
        var source_modelset = _source_models[bright_id];
        if (!source_modelset) {
            var source = read_state($(this), 
                guard.stateGetter('source'));
            source_modelset = guard.scanSource(source);
        }
        var is_unique = !_is_array(source_modelset);
        var source_model = source_modelset;
        if (!is_unique) {
            source_model = {};
            source_modelset.forEach(function(model){
                merge_source(this, model);
            }, source_model);
        }
        var user_data = is_function(fn) 
            ? fn(source_model) : fn;
        fix_userdata(user_data, guard);
        _source_models[bright_id] = is_unique 
            ? user_data : [user_data];
    },

    /**
     * @method
     * @param {UpdateEventName} subject
     * @param {Function} handler - accepts {@link DarkModelChanges}
     */
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

/**
 * @memberof module:darkdom
 * @alias DarkComponent
 * @class
 * @param {object}
 */
function DarkComponent(opt){
    opt = opt || {};
    this._config = _.config({}, opt, _defaults);
    this._stateGetters = _.copy(_default_states);
    this._stateSetters = _.copy(_default_states);
    this._components = {};
    this._contents = {};
    this._updaters = {};
    this._events = {};
    this.set(this._config);
}

DarkComponent.prototype = {

    /**
     * @method
     * @param {object}
     */
    set: function(opt){
        if (!opt) {
            return this;
        }
        _.config(this._config, opt, this._defaults);
        return this;
    },

    /**
     * @method
     * @param {string|object} name
     * @param {(function|string)} getter
     * @param {(function|string)} setter
     */
    state: function(name, getter, setter){
        if (typeof name === 'object') {
            _.each(name, function(getter, name){
                this.state(name, getter);
            }, this);
            return this;
        } 
        if (!setter && typeof getter === 'string') {
            return this.state(name, getter, getter);
        }
        if (_is_array(getter)) {
            return this.state(name, getter[0], getter[1]);
        }
        this._stateGetters[name] = getter;
        this._stateSetters[name] = setter;
        return this;
    },

    /**
     * @method
     */
    contain: function(name, component, opt){
        if (typeof name === 'object') {
            opt = component;
        }
        opt = opt || {};
        var dict = mix_setter(name, component, 
            this._components, { execFunc: true });
        if (opt.content) {
            _.mix(this._contents, dict);
        }
        return this;
    },

    /**
     * @method
     */
    forward: function(selector, subject){
        mix_setter(selector, subject, this._events);
        return this;
    },

    /**
     * @method
     */
    response: function(subject, handler){
        this._updaters[subject] = handler;
        return this;
    },

    /**
     * @method
     */
    component: function(name){
        return this._components[name];
    },

    /**
     * @method
     */
    createGuard: function(opt){
        return new exports.DarkGuard(_.mix({
            stateGetters: this._stateGetters,
            stateSetters: this._stateSetters,
            components: this._components,
            contents: this._contents,
            updaters: this._updaters,
            events: this._events,
            options: this._config
        }, opt));
    }

};

/**
 * @memberof module:darkdom
 * @alias DarkGuard
 * @class
 */
function DarkGuard(opt){
    this._stateGetters = Object.create(opt.stateGetters);
    this._stateSetters = Object.create(opt.stateSetters);
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

    /**
     * @borrows DarkComponent#state
     */
    state: DarkComponent.prototype.state,

    /**
     * @method
     */
    component: function(name, spec){
        mix_setter(name, spec, this._specs);
        return this;
    },

    /**
     * @method
     */
    forward: function(subject, selector){
        mix_setter(subject, selector, this._events);
        return this;
    },

    /**
     * @method
     */
    source: function(){
        if (!this._options.enableSource) {
            return;
        }
        return this._sourceGuard;
    },

    /**
     * @method
     */
    stateGetter: function(name){
        return this._stateGetters[name];
    },

    /**
     * @method
     */
    stateSetter: function(name){
        return this._stateSetters[name];
    },

    /**
     * @method
     */
    watch: function(targets){
        this.selectTargets(targets)
            .forEach(this.registerRoot, this);
        return this;
    },

    /**
     * @method
     */
    unwatch: function(targets){
        targets = targets 
            ? this.selectTargets(targets)
            : this._darkRoots;
        targets.forEach(this.unregisterRoot, this);
        return this;
    },

    /**
     * @method
     */
    mount: function(){
        this._darkRoots.forEach(this.mountRoot, this);
        return this;
    },

    /**
     * @method
     */
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

    gc: function(bright_id){
        _.each(this._darkRoots, function(target){
            if ($(target).attr(MY_BRIGHT) === bright_id) {
                this.unregisterRoot(target);
                return false;
            }
        }, this);
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
        _.each(DarkDOM.prototype, function(method, name){
            this[name] = method;
        }, target[0]);
        this._darkRoots.push(target[0]);
        return bright_id;
    },

    /**
     * @method
     */
    unregisterRoot: function(target){
        target = $(target);
        var bright_id = target.attr(MY_BRIGHT);
        if (this !== _guards[bright_id]) {
            return;
        }
        target.removeAttr(MY_BRIGHT);
        unregister(bright_id);
        _.each(DarkDOM.prototype, function(method, name){
            delete this[name];
        }, target[0]);
        clear(this._darkRoots, target[0]);
    },

    /**
     * @method
     */
    mountRoot: function(target){
        target = $(target);
        if (target.attr(IS_BRIGHT)
                || target[0].isMountedDarkDOM) {
            return this;
        }
        target.trigger('darkdom:willMount');
        var dark_model = render_root(this.scanRoot(target));
        target.hide().after(this.createRoot(dark_model));
        this._listen(dark_model);
        target[0].isMountedDarkDOM = true;
        run_script(dark_model);
        target.trigger('darkdom:rendered')
            .trigger('darkdom:mounted');
        return this;
    },

    /**
     * method
     */
    unmountRoot: function(target){
        target = $(target);
        var bright_id = target.attr(MY_BRIGHT);
        target.find('[' + MY_BRIGHT + ']').forEach(function(child){
            var child_id = $(child).attr(MY_BRIGHT);
            var guard = _guards[child_id];
            guard.unregisterRoot(child);
        }, _dark_models);
        $('#' + bright_id).remove();
        delete target[0].isMountedDarkDOM;
        delete _dark_models[bright_id];
    },

    bufferRoot: function(target){
        target = $(target);
        if (target.attr(IS_BRIGHT)) {
            return this;
        }
        var dark_model = this.scanRoot(target); 
        this._bufferModel(dark_model);
        target[0].isMountedDarkDOM = true;
        return this;
    },

    updateRoot: function(target){
        $(target).updateDarkDOM();
        return this;
    },

    scanRoot: function(target, opt){
        opt = opt || {};
        var is_source = this._config.isSource;
        var bright_id = is_source 
            ? this.registerRoot(target)
            : target.attr(MY_BRIGHT);
        var dark_model = {
            id: bright_id,
        };
        if (!is_source) {
            dark_model.context = this._config.contextModel;
        }
        dark_model.state = {};
        _.each(this._stateGetters, function(getter, name){
            this[name] = read_state(target, getter);
        }, dark_model.state);
        if (!opt.onlyStates) {
            this._scanComponents(dark_model, target);
        }
        if (!is_source
                && (dark_model.state.source 
                    || _source_models[bright_id])
                && this._sourceGuard) {
            this._mergeSource(dark_model, opt);
        }
        return dark_model;
    },

    _scanComponents: function(dark_model, target){
        var re = {}, cfg = this._config, opts = this._options;
        _.each(cfg.components, function(component, name){
            var guard = component.createGuard({
                contextModel: dark_model,
                contextTarget: target,
                isSource: cfg.isSource
            });
            var spec = this._specs[name];
            if (typeof spec === 'string') {
                guard.watch(spec);
            } else if (spec) {
                spec(guard);
            }
            guard.buffer();
            if (cfg.contents[name]) {
                guard._bufferContent();
            } else {
                re[name] = guard.releaseModel();
            }
        }, this);
        dark_model.componentData = re;
        dark_model.contentData = this._scanContents(target, {
            scriptContext: !opts.disableScript && target[0],
            entireAsContent: opts.entireAsContent,
            noComs: !Object.keys(cfg.components).length
        });
    },

    _scanContents: scan_contents,

    renderBuffer: function(){
        this._buffer.forEach(function(dark_model){
            render_root(dark_model);
        });
        return this;
    },

    releaseModel: function(){
        var re = this._buffer.slice();
        if (this._options.unique) {
            re = re[0] || {};
        }
        this._resetBuffer();
        return re;
    },

    _bufferModel: function(dark_model){
        this._buffer.push(dark_model);
    },

    _bufferContent: function(){
        this._buffer.forEach(function(dark_model){
            _content_buffer[dark_model.id] = dark_model;
        }, this);
        this._resetBuffer();
    },

    _resetBuffer: function(){
        this._buffer.length = 0;
        return this;
    },

    createRoot: function(dark_model){
        var html = this.render(dark_model);
        if (!RE_HTMLTAG.test(html)) {
            return html;
        }
        var bright_root = $(html);
        bright_root.attr(IS_BRIGHT, 'true');
        bright_root.attr('id', dark_model.id);
        return bright_root;
    },

    render: function(dark_model){
        return (this._options.render
            || default_render)(dark_model);
    },

    _listen: function(dark_model){
        if (dark_model.id) {
            this.registerEvents($('#' + dark_model.id));
        }
        _.each(dark_model.componentData || {}, function(dark_modelset){
            if (_is_array(dark_modelset)) {
                return dark_modelset.forEach(this._listen, this);
            }
            this._listen(dark_modelset);
        }, this);
        var cd = dark_model.contentData;
        if (cd) {
            _.each(cd._index || {}, this._listen, this);
        }
    },

    selectTargets: function(targets){
        targets = $(targets, this._config.contextTarget);
        if (this._options.unique) {
            targets = targets.eq(0);
        }
        return targets;
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

    /**
     * @method
     */
    defaultUpdater: function(changes){
        var re = false;
        if (!changes.model) {
            changes.root.remove();
            return re;
        }
        if (changes.root[0]) {
            this.createRoot(changes.model).replaceAll(changes.root);
            this._listen(changes.model);
            return re;
        }
    },

    registerEvents: function(bright_root){
        var bright_id = bright_root.attr('id'),
            guard = _guards[bright_id];
        if (!guard) {
            return;
        }
        var dark_root = DarkGuard.getDarkById(bright_id);
        _.each(guard._config.events, function(subject, bright_sel){
            bright_sel = RE_EVENT_SEL.exec(bright_sel);
            this.on(bright_sel[1], function(e){
                if (_matches_selector(e.target, bright_sel[2])) {
                    guard.triggerEvent(dark_root[0] 
                            ? dark_root : $(_.unique(guard._darkRoots)), 
                        subject, e);
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

    /**
     * @method
     */
    isSource: function(){
        return this._config.isSource;
    },

    createSource: function(opt){
        this._sourceGuard = new exports.DarkGuard(_.merge({
            isSource: true,
            contextTarget: null,
            options: _.merge({
                entireAsContent: opt.options.sourceAsContent 
                    || opt.options.entireAsContent,
                enableSource: false 
            }, opt.options)
        }, opt));
        return this._sourceGuard;
    },

    scanSource: function(selector){
        if (!selector) {
            return;
        }
        var guard = this._sourceGuard;
        guard._darkRoots.length = 0;
        var targets = guard.selectTargets(selector);
        guard.watch(targets);
        guard.buffer();
        var source_modelset = guard.releaseModel();
        guard.unwatch(targets);
        return source_modelset;
    },

    _mergeSource: function(dark_model, opt){
        var source = _source_models[dark_model.id];
        if (!source) {
            source = this.scanSource(dark_model.state.source);
        }
        if (!source) {
            return;
        }
        if (opt.onlyStates) {
            merge_source_states(dark_model, source, dark_model.context);
        } else {
            merge_source(dark_model, source, dark_model.context);
        }
    }

};

/**
 * @param {string} bright_id - bright root's id
 * @returns {$}
 */
DarkGuard.getDarkById = function(bright_id){
    return $('[' + MY_BRIGHT + '="' + bright_id + '"]');
};

/**
 * @desc gc
 */
DarkGuard.gc = function(){
    var current = {};
    $('[' + MY_BRIGHT + ']').forEach(function(target){
        this[$(target).attr(MY_BRIGHT)] = true;
    }, current);
    Object.keys(_guards).forEach(function(bright_id){
        if (this[bright_id] || $('#' + bright_id)[0]) {
            return;
        }
        var guard = _guards[bright_id];
        if (guard) {
            if (guard.isSource()) {
                return;
            }
            guard.gc(bright_id);
        } else {
            unregister(bright_id);
        }
    }, current);
};

init_plugins($);

/**
 * @memberof module:darkdom
 * @alias module:darkdom.initPlugins
 * @param {$} $
 * @desc Add DarkDOM API to Dollar/jQuery
 */
function init_plugins($){
    _.each(DarkDOM.prototype, function(method, name){
        this[name] = function(){
            var re;
            _.each(this, function(target){
                re = method.apply(target, this);
            }, arguments);
            return re === undefined ? this : re;
        };
    }, $.fn);
}

function clear(list, target){
    var i = list.indexOf(target);
    if (i !== -1) {
        list.splice(i, 1);
    }
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
    delete _dark_models[bright_id];
    delete _source_models[bright_id];
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

function run_script(dark_model){
    if (typeof dark_model !== 'object') {
        return;
    }
    var content = dark_model.contentData || {};
    if (content._script) {
        new Function('', content._script)
            .call(content._context);
    }
    _.each(content._index || {}, run_script);
    _.each(dark_model.componentData || [], run_script);
}

function update_target(target, opt){
    target = $(target);
    var bright_id = target.attr(MY_BRIGHT);
    if (!$.contains(document.body, target[0])) {
        if (!opt.onlyStates) {
            trigger_update(bright_id, null, {
                type: 'remove'
            });
        }
        return;
    }
    var guard = _guards[bright_id];
    var origin = _dark_models[bright_id];
    if (!guard || !origin) {
        return;
    }
    var dark_modelset;
    if (opt.onlyStates) {
        dark_modelset = guard.scanRoot(target, opt);
        compare_states(origin, dark_modelset);
        if (origin.state) {
            _.mix(origin.state, dark_modelset.state);
        }
    } else {
        dark_modelset = guard.bufferRoot(target)
            .renderBuffer()
            .releaseModel();
        compare_model(origin, 
            _is_array(dark_modelset) 
                ? dark_modelset[0] : dark_modelset);
    }
}

function compare_model(origin, new_model){
    if (!new_model || !new_model.id) {
        return trigger_update(origin.id, null, {
            type: 'remove'
        });
    }
    if (!origin.id) {
        new_model = new_model.context;
        return trigger_update(new_model.id, new_model, {
            type: 'component'
        });
    }
    var abort = compare_states(origin, new_model);
    if (abort === false) {
        return;
    }
    if (compare_contents(
        origin.contentData 
            || (origin.contentData = scan_contents()), 
        new_model.contentData
    )) {
        abort = trigger_update(new_model.id, new_model, {
            type: 'content',
            oldValue: origin.content,
            newValue: new_model.content
        });
        if (abort === false) {
            return;
        }
    }
    _.each(new_model.componentData, function(new_modelset, name){
        var changed = compare_components.apply(this, arguments);
        if (changed) {
            abort = trigger_update(new_model.id, new_model, {
                type: 'component',
                name: name,
                oldValue: this[name],
                newValue: new_modelset 
            });
            if (abort === false) {
                return false;
            }
        }
    }, origin.componentData || (origin.componentData = {}));
}

function compare_states(origin, new_model){
    var abort;
    _.each(new_model.state, function(value, name){
        if (this[name] != value) {
            abort = trigger_update(new_model.id, new_model, {
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
    return abort;
}

function compare_contents(origin, new_content){
    if (origin.text.length !== new_content.text.length) {
        return true;
    }
    var changed;
    _.each(new_content._index || {}, function(new_content, bright_id){
        if (!this[bright_id]) {
            changed = true;
            return false;
        }
        compare_model(this[bright_id], new_content);
    }, origin._index);
    return changed || (origin.text !== new_content.text);
}

function compare_components(new_modelset, name){
    if (!_is_array(new_modelset)) {
        compare_model(this[name] || (this[name] = {}), 
            new_modelset);
        return;
    }
    var changed;
    var originset = this[name] || (this[name] = []);
    var larger = originset.length < new_modelset.length 
        ? new_modelset 
        : originset;
    for (var i = 0, l = larger.length; i < l; i++) {
        if (!originset[i]) {
            changed = true;
            break;
        }
        if (!new_modelset[i] 
                || originset[i].id === new_modelset[i].id) {
            compare_model(originset[i], new_modelset[i]);
        } else {
            changed = true;
            break;
        }
    }
    return changed;
}

function trigger_update(bright_id, dark_model, changes){
    if (!bright_id) {
        return;
    }
    var dark_root = DarkGuard.getDarkById(bright_id);
    dark_root.trigger('darkdom:willUpdate');
    var re, bright_root = $('#' + bright_id),
        guard = _guards[bright_id];
    if (guard) {
        re = guard.triggerUpdate(_.mix(changes, {
            model: dark_model,
            root: bright_root,
            rootId: bright_id
        }));
    } else if (!dark_model) {
        bright_root.remove();
        re = false;
    }
    if (!dark_model || changes.type === "remove") {
        dark_root.trigger('darkdom:removed');
    } else if (re === false) {
        dark_root.trigger('darkdom:rendered');
    }
    dark_root.trigger('darkdom:updated');
    return re;
}

function merge_source(dark_model, source_model, context){
    if (_is_array(source_model)) {
        source_model.forEach(function(source_model){
            merge_source(this, source_model, context);
        }, dark_model);
        return dark_model;
    }
    merge_source_states(dark_model, source_model, context);
    // @note
    var content = dark_model.contentData 
        || (dark_model.contentData = scan_contents());
    var source_content = source_model.contentData;
    if (source_content && source_content.text
            && (!content.text 
                || content._hasOuter)) {
        content.text = source_content.text; 
        _.mix(content._index, source_content._index);
    }
    // @note
    if (!dark_model.componentData) {
        dark_model.componentData = {};
    }
    _.each(source_model.componentData || [],
        merge_source_components, dark_model);
    return dark_model;
}

function merge_source_states(dark_model, source_model, context){
    if (_is_array(source_model)) {
        source_model.forEach(function(source_model){
            merge_source_states(this, source_model, context);
        }, dark_model);
        return dark_model;
    }
    if (!dark_model.id) {
        dark_model.id = source_model.id;
    }
    dark_model.context = context;
    _.each(source_model.state || {}, function(value, name){
        if (this[name] === undefined) {
            this[name] = value;
        }
    }, dark_model.state || (dark_model.state = {}));
    return dark_model;
}

function merge_source_components(source_modelset, name){
    var context = this;
    var origin = context.componentData;
    if (_is_array(source_modelset)) {
        var origin_list = [];
        (origin[name] || []).forEach(function(model){
            if (!is_source_model(model)) {
                this.push(model);
            }
        }, origin_list);
        source_modelset.forEach(function(source_model){
            this.push(merge_source({}, source_model, context));
        }, origin[name] = origin_list);
    } else {
        if (is_source_model(origin[name] || {})) {
            origin[name] = source_modelset;
        } else {
            merge_source(origin[name] || (origin[name] = {}), 
                source_modelset, context);
        }
    }
}

function is_source_model(model){
    var guard = _guards[model.id];
    return guard && guard.isSource();
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
        data.contentData._hasOuter = guard._options.sourceAsContent 
            || guard._options.entireAsContent;
    }
}

function fix_userdata_component(component, name){
    var dataset = this[name];
    if (!dataset) {
        return;
    }
    if (!_is_array(dataset)) {
        dataset = [dataset];
    }
    dataset.forEach(function(data){
        fix_userdata(data, this.createGuard({
            isSource: true
        }));
    }, component);
}

function render_root(dark_model){
    _.each(dark_model.componentData, function(dark_modelset, name){
        if (_is_array(dark_modelset)) {
            this[name] = dark_modelset.map(function(dark_model){
                return render_model(dark_model);
            });
        } else {
            this[name] = render_model(dark_modelset);
        }
    }, dark_model.component || (dark_model.component = {}));
    var content_data = dark_model.contentData;
    dark_model.content = content_data.text
        .replace(RE_CONTENT_COM, function($0, bright_id){
            var dark_model = content_data._index[bright_id];
            if (dark_model === 'string') {
                return dark_model;
            }
            return render_model(dark_model);
        });
    _dark_models[dark_model.id] = dark_model;
    return dark_model;
}

function render_model(dark_model){
    var guard = _guards[dark_model.id];
    if (!guard) {
        return '';
    }
    if (!dark_model.component) {
        dark_model = render_root(dark_model);
    }
    var root = guard.createRoot(dark_model);
    return typeof root === 'string' 
        ? root
        : root[0].outerHTML;
}

function read_state(target, getter){
    return (typeof getter === 'string' 
        ? target.attr(getter) 
        : getter && getter(target)) || undefined;
}

function write_state(target, setter, value){
    if (typeof setter === 'string') {
        target.attr(setter, value);
    } else if (setter) {
        setter(target, value);
    }
}

function default_render(dark_model){
    return '<span>' + dark_model.content + '</span>';
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

/**
 * @param {Object} opt - options
 */
function exports(opt){
    return new exports.DarkComponent(opt);
}

exports.DarkDOM = DarkDOM;
exports.DarkComponent = DarkComponent;
exports.DarkGuard = DarkGuard;
/** 
 * @method
 * @borrows DarkGuard.getDarkById 
 * @see module:darkdom.DarkGuard.getDarkById
 */
exports.getDarkById = DarkGuard.getDarkById;
/** 
 * @method
 * @borrows DarkGuard.gc
 * @see module:darkdom.DarkGuard.gc
 */
exports.gc = DarkGuard.gc;
exports.initPlugins = init_plugins;

return exports;

});

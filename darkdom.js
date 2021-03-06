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
    _update_tm = 0,
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
    RE_INNER = /(<[\s\S]+?>)([\s\S]*)(<.+>)/,
    RE_ATTR_ID = /(\sid=['"])[^"']*/,
    RE_ATTR_MARK = new RegExp('(' + IS_BRIGHT + "=['\"])[^'\"]*"),
    RE_HTMLTAG = /^\s*(<[\w\-]+)([^>]*)>/;

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
     * @public
     * @returns {DarkGuard} 
     */
    darkGuard: function(){
        return _guards[this.getAttribute(MY_BRIGHT)];
    },

    /**
     * @public
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
     * @public
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
     * @public
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
     * @public
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
     * @public
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
     * @public
     */
    updateDarkStates: function(opt){
        update_target(this, _.merge({
            onlyStates: true
        }, opt));
    },

    /**
     * @public
     */
    updateDarkDOM: function(opt){
        opt = opt || {};
        update_target(this, opt);
        if (!opt.ignoreRender) {
            exports.DarkGuard.gc();
        }
    },

    /**
     * @public
     */
    updateDarkSource: function(){
        var bright_id = this.getAttribute(MY_BRIGHT);
        delete _source_models[bright_id];
        this.updateDarkDOM();
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
     * @public
     * @param {Function} fn - accepts {@link SourceModel}
     */
    feedDarkDOM: function(fn){
        var bright_id = this.getAttribute(MY_BRIGHT);
        update_source_model(bright_id, fn, true);
    },

    /**
     * @public
     */
    forwardDarkDOM: function(selector, handler){
        var bright_id = this.getAttribute(MY_BRIGHT);
        var guard = _guards[bright_id];
        var subject = bright_id + '|' + selector;
        mix_setter(selector, subject, guard._config.events);
        guard.forward(subject, handler);
        guard.registerEvents($('#' + bright_id), subject, selector);
    },

    /**
     * @public
     * @param {UpdateEventName} subject
     * @param {Function} handler - accepts {@link DarkModelChanges}
     */
    responseDarkDOM: function(subject, handler){
        var bright_id = this.getAttribute(MY_BRIGHT),
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
    this._stateGetters = _.copy(_default_states);
    this._stateSetters = _.copy(_default_states);
    this._components = {};
    this._contents = {};
    this._updaters = {};
    this._events = {};
    this._guardCache = null;
    this._specs = {};
    this._config = {};
    this.set(opt || {});
}

DarkComponent.prototype = {

    /**
     * @public
     * @param {object}
     */
    set: function(opt){
        if (!opt) {
            return this;
        }
        _.config(this._config, opt, _defaults);
        if (typeof opt.state !== 'undefined') {
            this.state(opt.state);
        }
        if (typeof opt.component !== 'undefined') {
            this.contain(opt.component);
        }
        if (typeof opt.forward !== 'undefined') {
            this.forward(opt.forward);
        }
        if (typeof opt.response !== 'undefined') {
            this.response(opt.response);
        }
        return this;
    },

    /**
     * @public
     */
    guard: function(selector, cfg, opt){
        var spec;
        if (typeof cfg === 'object') {
            opt = cfg;
            spec = function(guard){
                if (typeof cfg.state !== 'undefined') {
                    guard.state(cfg.state);
                }
                if (typeof cfg.component !== 'undefined') {
                    guard.component(cfg.component);
                }
                if (typeof cfg.forward !== 'undefined') {
                    guard.forward(cfg.forward);
                }
                if (typeof cfg.sourceState !== 'undefined') {
                    guard.source().state(cfg.sourceState);
                }
                if (typeof cfg.sourceComponent !== 'undefined') {
                    guard.source().component(cfg.sourceComponent);
                }
            };
        } else if (is_function(cfg)) {
            spec = cfg;
        }
        opt = opt || {};
        var specs = this._specs;
        if (!specs[selector]) {
            specs[selector] = [];
        }
        if (opt.override) {
            specs[selector].length = 0;
        }
        if (spec) {
            specs[selector].push(spec);
        }
        return this;
    },

    /**
     * @public
     */
    seek: function(parent){
        var guard, is_new_guard;
        if (parent) {
            guard = this.createGuard({
                contextTarget: parent
            });
            is_new_guard = true;
        } else {
            if (!this._guardCache) {
                this._guardCache = this.createGuard();
                is_new_guard = true;
            }
            guard = this._guardCache;
        }
        if (is_new_guard) {
            this._applyDefaultSpecs(guard);
        }
        this._applyDefaultWatch(guard);
        guard.mount();
        return this;
    },

    /**
     * @public
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
     * @public
     */
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

    /**
     * @public
     */
    forward: function(selector, subject){
        mix_setter(selector, subject, this._events);
        return this;
    },

    /**
     * @public
     */
    response: function(subject, handler){
        mix_setter(subject, handler, this._updaters);
        return this;
    },

    /**
     * @public
     */
    component: function(name){
        return this._components[name];
    },

    /**
     * @public
     */
    createGuard: function(opt){
        // @hotspot
        opt = opt || {};
        return new exports.DarkGuard({
            contextModel: opt.contextModel,
            contextTarget: opt.contextTarget,
            isSource: opt.isSource,
            stateGetters: this._stateGetters,
            stateSetters: this._stateSetters,
            components: this._components,
            contents: this._contents,
            updaters: this._updaters,
            events: this._events,
            options: this._config
        });
    },

    _applyDefaultSpecs: function(guard){
        _.each(this._specs, function(specs){
            specs.forEach(function(spec){
                spec(guard);
            });
        });
        return this;
    },

    _applyDefaultWatch: function(guard){
        _.each(this._specs, function(specs, selector){
            guard.watch(selector);
        });
        return this;
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
    this._config = opt;
    this._darkRoots = [];
    this._specs = {};
    this._buffer = [];
    this._events = {};
    this._sourceGuard = null;
}

DarkGuard.prototype = {

    /**
     * @borrows DarkComponent#state
     */
    state: DarkComponent.prototype.state,

    /**
     * @public
     */
    component: function(name, spec){
        mix_setter(name, spec, this._specs, {
            enableExtension: true
        });
        return this;
    },

    /**
     * @public
     */
    forward: function(subject, selector){
        mix_setter(subject, selector, this._events);
        return this;
    },

    /**
     * @public
     */
    source: function(){
        if (!this._options.enableSource) {
            return;
        }
        return this._sourceGuard
            || (this._sourceGuard = this.createSource(this._config));
    },

    /**
     * @public
     */
    stateGetter: function(name){
        return this._stateGetters[name];
    },

    /**
     * @public
     */
    stateSetter: function(name){
        return this._stateSetters[name];
    },

    /**
     * @public
     */
    watch: function(targets){
        this.selectTargets(targets)
            .forEach(this.registerRoot, this);
        return this;
    },

    /**
     * @public
     */
    unwatch: function(targets){
        targets = targets 
            ? this.selectTargets(targets)
            : this._darkRoots;
        targets.forEach(this.unregisterRoot, this);
        return this;
    },

    /**
     * @public
     */
    mount: function(){
        this._darkRoots.forEach(this.mountRoot, this);
        return this;
    },

    /**
     * @public
     */
    unmount: function(){
        this._darkRoots.forEach(this.unmountRoot, this);
        return this;
    },

    /**
     * @public
     */
    buffer: function(){
        this._darkRoots.forEach(this.bufferRoot, this);
        return this;
    },

    /**
     * @public
     */
    update: function(){
        this._darkRoots.forEach(this.updateRoot, this);
        return this;
    },

    gc: function(bright_id){
        _.each(this._darkRoots, function(elm){
            if (elm.getAttribute(MY_BRIGHT) === bright_id) {
                this.unregisterRoot(elm);
                return false;
            }
        }, this);
    },

    registerRoot: function(elm){
        // @hotspot
        if (elm.getAttribute(IS_BRIGHT)) {
            return;
        }
        var is_source = this._config.isSource;
        var bright_id = elm.getAttribute(MY_BRIGHT);
        if (!bright_id) {
            bright_id = uuid();
            if (!is_source) {
                elm.setAttribute(MY_BRIGHT, bright_id);
            }
        }
        if (!is_source
                && (elm.lastUpdateDarkDOM || 0) > _update_tm) {
            return bright_id;
        }
        _guards[bright_id] = this;
        if (!is_source) {
            var dom_api = DarkDOM.prototype;
            for (var name in dom_api) {
                elm[name] = dom_api[name];
            }
        } else {
            elm.isDarkSource = true;
        }
        this._darkRoots.push(elm);
        elm.lastUpdateDarkDOM = +new Date();
        return bright_id;
    },

    unregisterRoot: function(elm){
        var bright_id = elm.getAttribute(MY_BRIGHT);
        if (this !== _guards[bright_id]) {
            return;
        }
        elm.removeAttribute(MY_BRIGHT);
        unregister(bright_id);
        _.each(DarkDOM.prototype, function(method, name){
            delete this[name];
        }, elm);
        delete elm.lastUpdateDarkDOM;
        clear(this._darkRoots, elm);
    },

    mountRoot: function(elm){
        if (elm.getAttribute(IS_BRIGHT)
                || elm.isMountedDarkDOM) {
            return this;
        }
        var target = $(elm);
        target.trigger('darkdom:willMount');
        var dark_model = render_root(this.scanRoot(target));
        target.hide().after(this.render(dark_model));
        this._listen(dark_model);
        target[0].isMountedDarkDOM = true;
        run_script(dark_model);
        target.trigger('darkdom:rendered')
            .trigger('darkdom:mounted');
        return this;
    },

    unmountRoot: function(elm){
        var bright_id = elm.getAttribute(MY_BRIGHT);
        $('[' + MY_BRIGHT + ']', elm).forEach(function(child){
            var child_id = child.getAttribute(MY_BRIGHT);
            var guard = _guards[child_id];
            guard.unregisterRoot(child);
        }, _dark_models);
        $('#' + bright_id).remove();
        delete elm.isMountedDarkDOM;
        delete _dark_models[bright_id];
    },

    bufferRoot: function(elm){
        // @hotspot
        if (elm.getAttribute(IS_BRIGHT)) {
            return this;
        }
        var dark_model = this.scanRoot(elm); 
        this._bufferModel(dark_model);
        elm.isMountedDarkDOM = true;
        return this;
    },

    updateRoot: function(elm){
        elm.updateDarkDOM();
        return this;
    },

    scanRoot: function(target, opt){
        // @hotspot
        target = $(target);
        opt = opt || {};
        var is_source = this._config.isSource;
        var bright_id = is_source 
            ? this.registerRoot(target[0])
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
                && this._options.enableSource) {
            this._mergeSource(dark_model, opt);
        }
        return dark_model;
    },

    _scanComponents: function(dark_model, target){
        var cfg = this._config, 
            opts = this._options,
            specs = this._specs, 
            guard_opt = {
                contextModel: dark_model,
                contextTarget: target,
                isSource: cfg.isSource
            },
            non_contents = {},
            re = {};
        _.each(cfg.components, function(component, name){
            if (!cfg.contents[name]) {
                non_contents[name] = component;
                return;
            }
            var guard = auto_guard(component, name);
            guard._bufferContent();
        });
        _.each(non_contents, function(component, name){
            var guard = auto_guard(component, name);
            re[name] = guard.releaseModel();
        });
        dark_model.componentData = re;
        dark_model.contentData = this._scanContents(target, {
            scriptContext: !opts.disableScript && target[0],
            entireAsContent: opts.entireAsContent,
            noComs: !Object.keys(cfg.components).length
        });
        function auto_guard(component, name){
            var guard = component.createGuard(guard_opt);
            var spec = specs[name];
            if (spec) {
                var last_fn = spec[spec.length - 1];
                if (typeof last_fn === 'string') {
                    guard.watch(last_fn);
                } else if (spec) {
                    exec_queue(spec, [guard, target]);
                }
            } else {
                component._applyDefaultSpecs(guard)
                    ._applyDefaultWatch(guard);
            }
            guard.buffer();
            return guard;
        }
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

    render: function(dark_model){
        var html = (this._options.render 
            || default_render)(dark_model);
        return html.replace(RE_HTMLTAG, function($0, $1, $2){
            var has_id, has_mark;
            $2 = $2.replace(RE_ATTR_ID, function($0, $1){
                has_id = true;
                return $1 + dark_model.id;
            });
            $2 = $2.replace(RE_ATTR_MARK, function($0, $1){
                has_mark = true;
                return $1 + 'true';
            });
            if (!has_id) {
                $2 = ' id="' + dark_model.id + '"' + $2;
            }
            if (!has_mark) {
                $2 = ' ' + IS_BRIGHT + '="true"' + $2;
            }
            return $1 + $2 + '>';
        });
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
            $(this.render(changes.model)).replaceAll(changes.root);
            this._listen(changes.model);
            return re;
        }
    },

    registerEvents: function(bright_root, subject, selector){
        var bright_id = bright_root.attr('id'),
            guard = _guards[bright_id];
        if (!guard) {
            return;
        }
        if (selector) {
            register.call(bright_root, subject, selector);
        } else {
            _.each(guard._config.events, register, bright_root);
        }
        function register(subject, bright_sel){
            bright_sel = RE_EVENT_SEL.exec(bright_sel);
            this.on(bright_sel[1], function(e){
                if (_matches_selector(e.target, bright_sel[2])) {
                    guard.triggerEvent(bright_id, subject, e);
                }
                return false;
            });
        }
    },

    triggerEvent: function(bright_id, subject, e){
        var dark_sel = this._events[subject];
        if (!dark_sel) {
            return;
        }
        var target = DarkGuard.getDarkById(bright_id);
        if (!target[0]) {
            return dark_sel(e, null, function(fn){
                update_source_model(bright_id, fn);
            });
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
     * @public
     */
    isSource: function(){
        return this._config.isSource;
    },

    createSource: function(opt){
        // @hotspot
        var i, options = opt.options,
            source_options = {};
        for (i in options) {
            source_options[i] = options[i];
        }
        source_options.entireAsContent = options.sourceAsContent 
            || options.entireAsContent;
        source_options.enableSource = false;
        var source_opt = {};
        for (i in opt) {
            source_opt[i] = opt[i];
        }
        source_opt.isSource = true;
        source_opt.contextTarget = null;
        source_opt.options = source_options;
        return new exports.DarkGuard(source_opt);
    },

    scanSource: function(bright_id, selector){
        if (!selector) {
            return;
        }
        var guard = this.source();
        guard._darkRoots.length = 0;
        var targets = guard.selectTargets(selector);
        guard.watch(targets);
        guard.buffer();
        var source_modelset = guard.releaseModel();
        guard.unwatch(targets);
        var source_model = source_modelset;
        if (_is_array(source_modelset)) {
            source_model = {};
            source_modelset.forEach(function(model){
                merge_source(this, model);
            }, source_model);
        }
        return source_model;
    },

    _mergeSource: function(dark_model, opt){
        var bright_id = dark_model.id;
        var source = _source_models[bright_id];
        if (!source) {
            source = this.scanSource(bright_id, dark_model.state.source);
            if (!source) {
                return;
            }
            _source_models[bright_id] = source;
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

DarkGuard.getDarkByCustomId = function(custom_id){
    var re;
    _.each($('body #' + custom_id), function(node){
        if (!this(node, '[dd-autogen] #' + custom_id)) {
            re = $(node);
            return false;
        }
    }, $.matches);
    return re || $();
};

/**
 * @desc gc
 */
DarkGuard.gc = function(){
    var current = {};
    $('[' + MY_BRIGHT + ']').forEach(function(elm){
        this[elm.getAttribute(MY_BRIGHT)] = true;
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
                if (name in target) {
                    re = method.apply(target, this);
                }
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
            target.clone().removeAttr(MY_BRIGHT)[0]);
    } else {
        target.contents().forEach(content_spider, opt);
    }
    return data;
}

function content_spider(content){
    // @hotspot
    var data = this.data;
    if (content.nodeType !== 1) {
        if (content.nodeType === 3) {
            content = content.textContent || content.nodeValue;
            if (/\S/.test(content)) {
                data.text += content;
            }
        }
        return;
    } else if (data._context
            && content.nodeName === 'SCRIPT'
            && content.getAttribute('type') === 'text/darkscript') {
        data._script += content.innerHTML;
        return;
    }
    var mark = content.isMountedDarkDOM;
    if (this.noComs 
            && (!this.scriptContext
                || !content.getElementsByTagName('script').length)) {
        if (!mark) {
            data.text += content.outerHTML || '';
        }
        return;
    }
    var buffer_id = content.getAttribute(MY_BRIGHT),
        buffer = _content_buffer[buffer_id];
    delete _content_buffer[buffer_id];
    if (buffer) {
        data._index[buffer_id] = buffer;
        data.text += '{{' + MY_BRIGHT + '=' + buffer_id + '}}';
    } else if (!mark) {
        var childs_data = scan_contents($(content));
        var content_html = content.outerHTML || '';
        if (is_empty_object(childs_data._index)) {
            data.text += content_html;
        } else {
            data.text += content_html.replace(RE_INNER, 
                '$1' + childs_data.text + '$3');
            _.mix(data._index, childs_data._index);
        }
    }
}

function run_script(dark_model){
    if (typeof dark_model !== 'object') {
        return;
    }
    if (Array.isArray(dark_model)) {
        return dark_model.forEach(run_script);
    }
    var content = dark_model.contentData || {};
    if (content._script) {
        new Function('', content._script)
            .call(content._context);
    }
    _.each(content._index || {}, run_script);
    _.each(dark_model.componentData || {}, run_script);
}

function update_target(elm, opt){
    var bright_id = elm.getAttribute(MY_BRIGHT);
    if (!$.contains(document.body, elm)) {
        if (!opt.onlyStates && !opt.ignoreRender) {
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
    _update_tm = +new Date();
    var dark_modelset;
    if (opt.onlyStates) {
        dark_modelset = guard.scanRoot(elm, opt);
        _.merge(dark_modelset, origin);
        if (!opt.ignoreRender) {
            compare_states(origin, dark_modelset);
        }
        if (origin.state) {
            _.mix(origin.state, dark_modelset.state);
        }
    } else {
        dark_modelset = guard.bufferRoot(elm)
            .renderBuffer()
            .releaseModel();
        if (opt.ignoreRender) {
            return;
        }
        compare_model(origin, 
            _is_array(dark_modelset) 
                ? dark_modelset[0] : dark_modelset);
    }
    _update_tm = 0;
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
    if (!content.text) {
        content.text = '';
    }
    if (source_content && source_content.text) {
        content.text += source_content.text; 
        _.mix(content._index, source_content._index);
    }
    // @note
    if (!dark_model.componentData) {
        dark_model.componentData = {};
    }
    _.each(source_model.componentData || {},
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

function update_source_model(bright_id, fn, is_feed){
    var has_handler = is_function(fn);
    if (is_feed && !has_handler) {
        _source_models[bright_id] = setter(fn);
        return;
    }
    var source = find_root(bright_id);
    var is_child;
    if (!is_child) {
        _source_models[bright_id] = setter(source);
    } else {
        update_child(source);
    }
    function find_root(current_id){
        var root = _source_models[current_id];
        if (root) {
            return root;
        }
        is_child = true;
        current_id = _dark_models[current_id].context.id;
        return find_root(current_id);
    }
    function update_child(model){
        _.each(model.componentData, function(child, name){
            if (_is_array(child)){
                var re = true;
                _.each(child, function(child, i){
                    if (child.id === bright_id) {
                        this[i] = setter(child);
                        return re = false;
                    }
                }, child);
                return re;
            } else if (model.id === bright_id) {
                this[name] = setter(model);
                return false;
            }
            update_child(child);
        }, model);
    }
    function setter(model){
        var user_data = has_handler 
            ? (fn(model) || model) : fn;
        fix_userdata(user_data, _guards[bright_id].source());
        return user_data;
    }
}

function fix_userdata(data, guard){
    if (!data.id) {
        data.id = uuid();
        _guards[data.id] = guard;
    }
    if (!data.state) {
        data.state = {};
    }
    if (data.componentData) {
        _.each(guard._config.components, fix_userdata_component, {
            specs: guard._specs,
            data: data.componentData
        });
    } else {
        data.componentData = {};
    }
    if (data.contentData) {
        data.contentData._hasOuter = guard._options.sourceAsContent 
            || guard._options.entireAsContent;
    } else {
        data.contentData = {};
    }
}

function fix_userdata_component(component, name){
    var dataset = this.data[name];
    if (!dataset) {
        return;
    }
    if (!_is_array(dataset)) {
        dataset = [dataset];
    }
    var spec = this.specs[name];
    if (spec && typeof spec[spec.length - 1] === 'string') {
        spec = false;
    }
    dataset.forEach(function(data){
        var fake_parent = $();
        var user_guard = this.createGuard({
            contextTarget: fake_parent,
            isSource: true
        });
        if (spec) {
            exec_queue(spec, [user_guard, fake_parent]);
        }
        fix_userdata(data, user_guard);
    }, component);
}

function render_root(dark_model){
    _.each(dark_model.componentData, function(dark_modelset, name){
        if (_is_array(dark_modelset)) {
            this[name] = dark_modelset.map(function(dark_model){
                return this(dark_model);
            }, render_model);
        } else {
            this[name] = render_model(dark_modelset);
        }
    }, dark_model.component || (dark_model.component = {}));
    var content_data = dark_model.contentData;
    var index = content_data._index;
    var text = content_data.text;
    if (!is_empty_object(index)) {
        text = text.replace(RE_CONTENT_COM, function($0, bright_id){
            var dark_model = index[bright_id];
            if (typeof dark_model === 'string') {
                return dark_model;
            }
            return render_model(dark_model);
        });
    }
    dark_model.content = text;
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
    return guard.render(dark_model);
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

function is_empty_object(obj) {
    for (var name in obj) {
        name = null;
        return false;
    }
    return true;
}

function mix_setter(key, value, context, opt){
    var re = {};
    if (key === false) {
        for (var i in context) {
            delete context[i];
        }
        return re;
    }
    opt = opt || {};
    var dict = key;
    if (typeof dict !== 'object') {
        dict = {};
        dict[key] = value;
    }
    _.each(dict, function(value, key){
        if (opt.execFunc && is_function(value)) {
            value = value(this[key]);
        }
        if (opt.enableExtension) {
            if (!this[key]) {
                this[key] = [];
            }
            if (!re[key]) {
                re[key] = [];
            }
            this[key].push(value);
            re[key].push(value);
        } else {
            this[key] = re[key] = value;
        }
    }, context);
    return re;
}

function exec_queue(queue, args){
    if (queue.length > 1) {
        queue.reduce(function(orig_fn, new_fn){
            return function(){
                var args = [].slice.call(arguments);
                args[args.length] = orig_fn;
                return new_fn.apply(this, args);
            };
        }).apply(this, args);
    } else {
        queue[0].apply(this, args);
    }
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
 * @borrows DarkGuard.getDarkByCustomId
 * @see module:darkdom.DarkGuard.getDarkByCustomId
 */
exports.getDarkByCustomId = DarkGuard.getDarkByCustomId;
/** 
 * @method
 * @borrows DarkGuard.gc
 * @see module:darkdom.DarkGuard.gc
 */
exports.gc = DarkGuard.gc;
exports.initPlugins = init_plugins;

return exports;

});

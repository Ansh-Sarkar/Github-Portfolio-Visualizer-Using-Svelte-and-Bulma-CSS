
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.37.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /**
     * @typedef {Object} WrappedComponent Object returned by the `wrap` method
     * @property {SvelteComponent} component - Component to load (this is always asynchronous)
     * @property {RoutePrecondition[]} [conditions] - Route pre-conditions to validate
     * @property {Object} [props] - Optional dictionary of static props
     * @property {Object} [userData] - Optional user data dictionary
     * @property {bool} _sveltesparouter - Internal flag; always set to true
     */

    /**
     * @callback AsyncSvelteComponent
     * @returns {Promise<SvelteComponent>} Returns a Promise that resolves with a Svelte component
     */

    /**
     * @callback RoutePrecondition
     * @param {RouteDetail} detail - Route detail object
     * @returns {boolean|Promise<boolean>} If the callback returns a false-y value, it's interpreted as the precondition failed, so it aborts loading the component (and won't process other pre-condition callbacks)
     */

    /**
     * @typedef {Object} WrapOptions Options object for the call to `wrap`
     * @property {SvelteComponent} [component] - Svelte component to load (this is incompatible with `asyncComponent`)
     * @property {AsyncSvelteComponent} [asyncComponent] - Function that returns a Promise that fulfills with a Svelte component (e.g. `{asyncComponent: () => import('Foo.svelte')}`)
     * @property {SvelteComponent} [loadingComponent] - Svelte component to be displayed while the async route is loading (as a placeholder); when unset or false-y, no component is shown while component
     * @property {object} [loadingParams] - Optional dictionary passed to the `loadingComponent` component as params (for an exported prop called `params`)
     * @property {object} [userData] - Optional object that will be passed to events such as `routeLoading`, `routeLoaded`, `conditionsFailed`
     * @property {object} [props] - Optional key-value dictionary of static props that will be passed to the component. The props are expanded with {...props}, so the key in the dictionary becomes the name of the prop.
     * @property {RoutePrecondition[]|RoutePrecondition} [conditions] - Route pre-conditions to add, which will be executed in order
     */

    /**
     * Wraps a component to enable multiple capabilities:
     * 1. Using dynamically-imported component, with (e.g. `{asyncComponent: () => import('Foo.svelte')}`), which also allows bundlers to do code-splitting.
     * 2. Adding route pre-conditions (e.g. `{conditions: [...]}`)
     * 3. Adding static props that are passed to the component
     * 4. Adding custom userData, which is passed to route events (e.g. route loaded events) or to route pre-conditions (e.g. `{userData: {foo: 'bar}}`)
     * 
     * @param {WrapOptions} args - Arguments object
     * @returns {WrappedComponent} Wrapped component
     */
    function wrap$1(args) {
        if (!args) {
            throw Error('Parameter args is required')
        }

        // We need to have one and only one of component and asyncComponent
        // This does a "XNOR"
        if (!args.component == !args.asyncComponent) {
            throw Error('One and only one of component and asyncComponent is required')
        }

        // If the component is not async, wrap it into a function returning a Promise
        if (args.component) {
            args.asyncComponent = () => Promise.resolve(args.component);
        }

        // Parameter asyncComponent and each item of conditions must be functions
        if (typeof args.asyncComponent != 'function') {
            throw Error('Parameter asyncComponent must be a function')
        }
        if (args.conditions) {
            // Ensure it's an array
            if (!Array.isArray(args.conditions)) {
                args.conditions = [args.conditions];
            }
            for (let i = 0; i < args.conditions.length; i++) {
                if (!args.conditions[i] || typeof args.conditions[i] != 'function') {
                    throw Error('Invalid parameter conditions[' + i + ']')
                }
            }
        }

        // Check if we have a placeholder component
        if (args.loadingComponent) {
            args.asyncComponent.loading = args.loadingComponent;
            args.asyncComponent.loadingParams = args.loadingParams || undefined;
        }

        // Returns an object that contains all the functions to execute too
        // The _sveltesparouter flag is to confirm the object was created by this router
        const obj = {
            component: args.asyncComponent,
            userData: args.userData,
            conditions: (args.conditions && args.conditions.length) ? args.conditions : undefined,
            props: (args.props && Object.keys(args.props).length) ? args.props : {},
            _sveltesparouter: true
        };

        return obj
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function regexparam (str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules\svelte-spa-router\Router.svelte generated by Svelte v3.37.0 */

    const { Error: Error_1, Object: Object_1$1, console: console_1 } = globals;

    // (209:0) {:else}
    function create_else_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(209:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (202:0) {#if componentParams}
    function create_if_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ params: /*componentParams*/ ctx[1] }, /*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*componentParams, props*/ 6)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*componentParams*/ 2 && { params: /*componentParams*/ ctx[1] },
    					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(202:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function wrap(component, userData, ...conditions) {
    	// Use the new wrap method and show a deprecation warning
    	// eslint-disable-next-line no-console
    	console.warn("Method `wrap` from `svelte-spa-router` is deprecated and will be removed in a future version. Please use `svelte-spa-router/wrap` instead. See http://bit.ly/svelte-spa-router-upgrading");

    	return wrap$1({ component, userData, conditions });
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    	const hashPosition = window.location.href.indexOf("#/");

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: "/";

    	// Check if there's a querystring
    	const qsPosition = location.indexOf("?");

    	let querystring = "";

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	set(getLocation());

    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener("hashchange", update, false);

    	return function stop() {
    		window.removeEventListener("hashchange", update, false);
    	};
    });

    const location = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);

    async function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	// Note: this will include scroll state in history even when restoreScrollState is false
    	history.replaceState(
    		{
    			scrollX: window.scrollX,
    			scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	window.location.hash = (location.charAt(0) == "#" ? "" : "#") + location;
    }

    async function pop() {
    	// Execute this code when the current call stack is complete
    	await tick();

    	window.history.back();
    }

    async function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	const dest = (location.charAt(0) == "#" ? "" : "#") + location;

    	try {
    		window.history.replaceState(undefined, undefined, dest);
    	} catch(e) {
    		// eslint-disable-next-line no-console
    		console.warn("Caught exception while replacing the current page. If you're running this in the Svelte REPL, please note that the `replace` method might not work in this environment.");
    	}

    	// The method above doesn't trigger the hashchange event, so let's do that manually
    	window.dispatchEvent(new Event("hashchange"));
    }

    function link(node, hrefVar) {
    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != "a") {
    		throw Error("Action \"link\" can only be used with <a> tags");
    	}

    	updateLink(node, hrefVar || node.getAttribute("href"));

    	return {
    		update(updated) {
    			updateLink(node, updated);
    		}
    	};
    }

    // Internal function used by the link function
    function updateLink(node, href) {
    	// Destination must start with '/'
    	if (!href || href.length < 1 || href.charAt(0) != "/") {
    		throw Error("Invalid value for \"href\" attribute: " + href);
    	}

    	// Add # to the href attribute
    	node.setAttribute("href", "#" + href);

    	node.addEventListener("click", scrollstateHistoryHandler);
    }

    /**
     * The handler attached to an anchor tag responsible for updating the
     * current history state with the current scroll state
     *
     * @param {HTMLElementEventMap} event - an onclick event attached to an anchor tag
     */
    function scrollstateHistoryHandler(event) {
    	// Prevent default anchor onclick behaviour
    	event.preventDefault();

    	const href = event.currentTarget.getAttribute("href");

    	// Setting the url (3rd arg) to href will break clicking for reasons, so don't try to do that
    	history.replaceState(
    		{
    			scrollX: window.scrollX,
    			scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	// This will force an update as desired, but this time our scroll state will be attached
    	window.location.hash = href;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Router", slots, []);
    	let { routes = {} } = $$props;
    	let { prefix = "" } = $$props;
    	let { restoreScrollState = false } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent|WrappedComponent} component - Svelte component for the route, optionally wrapped
     */
    		constructor(path, component) {
    			if (!component || typeof component != "function" && (typeof component != "object" || component._sveltesparouter !== true)) {
    				throw Error("Invalid component object");
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == "string" && (path.length < 1 || path.charAt(0) != "/" && path.charAt(0) != "*") || typeof path == "object" && !(path instanceof RegExp)) {
    				throw Error("Invalid value for \"path\" argument - strings must start with / or *");
    			}

    			const { pattern, keys } = regexparam(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == "object" && component._sveltesparouter === true) {
    				this.component = component.component;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    				this.props = component.props || {};
    			} else {
    				// Convert the component to a function that returns a Promise, to normalize it
    				this.component = () => Promise.resolve(component);

    				this.conditions = [];
    				this.props = {};
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, check if it matches the start of the path.
    			// If not, bail early, else remove it before we run the matching.
    			if (prefix) {
    				if (typeof prefix == "string") {
    					if (path.startsWith(prefix)) {
    						path = path.substr(prefix.length) || "/";
    					} else {
    						return null;
    					}
    				} else if (prefix instanceof RegExp) {
    					const match = path.match(prefix);

    					if (match && match[0]) {
    						path = path.substr(match[0].length) || "/";
    					} else {
    						return null;
    					}
    				}
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				// In the match parameters, URL-decode all values
    				try {
    					out[this._keys[i]] = decodeURIComponent(matches[i + 1] || "") || null;
    				} catch(e) {
    					out[this._keys[i]] = null;
    				}

    				i++;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoading`, `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {string|RegExp} route - Route matched as defined in the route definition (could be a string or a reguar expression object)
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {object} [userData] - Custom data passed by the user
     * @property {SvelteComponent} [component] - Svelte component (only in `routeLoaded` events)
     * @property {string} [name] - Name of the Svelte component (only in `routeLoaded` events)
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {bool} Returns true if all the conditions succeeded
     */
    		async checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!await this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;
    	let props = {};

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	async function dispatchNextTick(name, detail) {
    		// Execute this code when the current call stack is complete
    		await tick();

    		dispatch(name, detail);
    	}

    	// If this is set, then that means we have popped into this var the state of our last scroll position
    	let previousScrollState = null;

    	if (restoreScrollState) {
    		window.addEventListener("popstate", event => {
    			// If this event was from our history.replaceState, event.state will contain
    			// our scroll history. Otherwise, event.state will be null (like on forward
    			// navigation)
    			if (event.state && event.state.scrollY) {
    				previousScrollState = event.state;
    			} else {
    				previousScrollState = null;
    			}
    		});

    		afterUpdate(() => {
    			// If this exists, then this is a back navigation: restore the scroll position
    			if (previousScrollState) {
    				window.scrollTo(previousScrollState.scrollX, previousScrollState.scrollY);
    			} else {
    				// Otherwise this is a forward navigation: scroll to top
    				window.scrollTo(0, 0);
    			}
    		});
    	}

    	// Always have the latest value of loc
    	let lastLoc = null;

    	// Current object of the component loaded
    	let componentObj = null;

    	// Handle hash change events
    	// Listen to changes in the $loc store and update the page
    	// Do not use the $: syntax because it gets triggered by too many things
    	loc.subscribe(async newLoc => {
    		lastLoc = newLoc;

    		// Find a route matching the location
    		let i = 0;

    		while (i < routesList.length) {
    			const match = routesList[i].match(newLoc.location);

    			if (!match) {
    				i++;
    				continue;
    			}

    			const detail = {
    				route: routesList[i].path,
    				location: newLoc.location,
    				querystring: newLoc.querystring,
    				userData: routesList[i].userData
    			};

    			// Check if the route can be loaded - if all conditions succeed
    			if (!await routesList[i].checkConditions(detail)) {
    				// Don't display anything
    				$$invalidate(0, component = null);

    				componentObj = null;

    				// Trigger an event to notify the user, then exit
    				dispatchNextTick("conditionsFailed", detail);

    				return;
    			}

    			// Trigger an event to alert that we're loading the route
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick("routeLoading", Object.assign({}, detail));

    			// If there's a component to show while we're loading the route, display it
    			const obj = routesList[i].component;

    			// Do not replace the component if we're loading the same one as before, to avoid the route being unmounted and re-mounted
    			if (componentObj != obj) {
    				if (obj.loading) {
    					$$invalidate(0, component = obj.loading);
    					componentObj = obj;
    					$$invalidate(1, componentParams = obj.loadingParams);
    					$$invalidate(2, props = {});

    					// Trigger the routeLoaded event for the loading component
    					// Create a copy of detail so we don't modify the object for the dynamic route (and the dynamic route doesn't modify our object too)
    					dispatchNextTick("routeLoaded", Object.assign({}, detail, { component, name: component.name }));
    				} else {
    					$$invalidate(0, component = null);
    					componentObj = null;
    				}

    				// Invoke the Promise
    				const loaded = await obj();

    				// Now that we're here, after the promise resolved, check if we still want this component, as the user might have navigated to another page in the meanwhile
    				if (newLoc != lastLoc) {
    					// Don't update the component, just exit
    					return;
    				}

    				// If there is a "default" property, which is used by async routes, then pick that
    				$$invalidate(0, component = loaded && loaded.default || loaded);

    				componentObj = obj;
    			}

    			// Set componentParams only if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    			// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    			if (match && typeof match == "object" && Object.keys(match).length) {
    				$$invalidate(1, componentParams = match);
    			} else {
    				$$invalidate(1, componentParams = null);
    			}

    			// Set static props, if any
    			$$invalidate(2, props = routesList[i].props);

    			// Dispatch the routeLoaded event then exit
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick("routeLoaded", Object.assign({}, detail, { component, name: component.name }));

    			return;
    		}

    		// If we're still here, there was no match, so show the empty component
    		$$invalidate(0, component = null);

    		componentObj = null;
    	});

    	const writable_props = ["routes", "prefix", "restoreScrollState"];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	function routeEvent_handler(event) {
    		bubble($$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("routes" in $$props) $$invalidate(3, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ("restoreScrollState" in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		derived,
    		tick,
    		_wrap: wrap$1,
    		wrap,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		push,
    		pop,
    		replace,
    		link,
    		updateLink,
    		scrollstateHistoryHandler,
    		createEventDispatcher,
    		afterUpdate,
    		regexparam,
    		routes,
    		prefix,
    		restoreScrollState,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		props,
    		dispatch,
    		dispatchNextTick,
    		previousScrollState,
    		lastLoc,
    		componentObj
    	});

    	$$self.$inject_state = $$props => {
    		if ("routes" in $$props) $$invalidate(3, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ("restoreScrollState" in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    		if ("component" in $$props) $$invalidate(0, component = $$props.component);
    		if ("componentParams" in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    		if ("props" in $$props) $$invalidate(2, props = $$props.props);
    		if ("previousScrollState" in $$props) previousScrollState = $$props.previousScrollState;
    		if ("lastLoc" in $$props) lastLoc = $$props.lastLoc;
    		if ("componentObj" in $$props) componentObj = $$props.componentObj;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*restoreScrollState*/ 32) {
    			// Update history.scrollRestoration depending on restoreScrollState
    			history.scrollRestoration = restoreScrollState ? "manual" : "auto";
    		}
    	};

    	return [
    		component,
    		componentParams,
    		props,
    		routes,
    		prefix,
    		restoreScrollState,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			routes: 3,
    			prefix: 4,
    			restoreScrollState: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restoreScrollState() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restoreScrollState(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\GithubIcon.svelte generated by Svelte v3.37.0 */

    const file$6 = "src\\components\\GithubIcon.svelte";

    function create_fragment$6(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "fill-rule", "evenodd");
    			attr_dev(path, "d", "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z");
    			add_location(path, file$6, 8, 3, 210);
    			attr_dev(svg, "aria-hidden", "true");
    			attr_dev(svg, "class", "octicon svelte-1pou8kn");
    			attr_dev(svg, "height", "64");
    			attr_dev(svg, "role", "img");
    			attr_dev(svg, "viewBox", "0 0 16 16");
    			attr_dev(svg, "width", "64");
    			set_style(svg, "display", "inline-block");
    			set_style(svg, "fill", "currentColor");
    			set_style(svg, "user-select", "none");
    			set_style(svg, "vertical-align", "text-bottom");
    			add_location(svg, file$6, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("GithubIcon", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<GithubIcon> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class GithubIcon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "GithubIcon",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\routes\Home.svelte generated by Svelte v3.37.0 */
    const file$5 = "src\\routes\\Home.svelte";

    function create_fragment$5(ctx) {
    	let div10;
    	let div0;
    	let a0;
    	let githubicon;
    	let t0;
    	let h2;
    	let t2;
    	let input;
    	let t3;
    	let nav;
    	let div9;
    	let div5;
    	let a1;
    	let t5;
    	let div1;
    	let a2;
    	let img;
    	let img_src_value;
    	let t6;
    	let a3;
    	let span0;
    	let t7;
    	let span1;
    	let t8;
    	let span2;
    	let t9;
    	let div4;
    	let div3;
    	let div2;
    	let a4;
    	let t11;
    	let div8;
    	let div7;
    	let div6;
    	let a5;
    	let strong0;
    	let t13;
    	let a6;
    	let strong1;
    	let current;
    	let mounted;
    	let dispose;
    	githubicon = new GithubIcon({ $$inline: true });

    	const block = {
    		c: function create() {
    			div10 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			create_component(githubicon.$$.fragment);
    			t0 = space();
    			h2 = element("h2");
    			h2.textContent = "Search Github by Username";
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			nav = element("nav");
    			div9 = element("div");
    			div5 = element("div");
    			a1 = element("a");
    			a1.textContent = "Powered By :";
    			t5 = space();
    			div1 = element("div");
    			a2 = element("a");
    			img = element("img");
    			t6 = space();
    			a3 = element("a");
    			span0 = element("span");
    			t7 = space();
    			span1 = element("span");
    			t8 = space();
    			span2 = element("span");
    			t9 = space();
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			a4 = element("a");
    			a4.textContent = "Documentation";
    			t11 = space();
    			div8 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			a5 = element("a");
    			strong0 = element("strong");
    			strong0.textContent = "Github";
    			t13 = space();
    			a6 = element("a");
    			strong1 = element("strong");
    			strong1.textContent = "LinkedIn";
    			attr_dev(a0, "href", "https://github.com/Ansh-Sarkar");
    			attr_dev(a0, "target", "_blank");
    			add_location(a0, file$5, 15, 4, 326);
    			attr_dev(h2, "class", "title pt-2 svelte-1c86hlr");
    			add_location(h2, file$5, 18, 4, 421);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "input");
    			add_location(input, file$5, 19, 4, 480);
    			attr_dev(div0, "class", "search svelte-1c86hlr");
    			add_location(div0, file$5, 14, 2, 300);
    			attr_dev(a1, "class", "navbar-item");
    			attr_dev(a1, "href", "https://bulma.io/");
    			add_location(a1, file$5, 34, 8, 834);
    			if (img.src !== (img_src_value = "https://bulma.io/images/bulma-logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", "112");
    			attr_dev(img, "height", "28");
    			attr_dev(img, "alt", "logo");
    			add_location(img, file$5, 38, 12, 1011);
    			attr_dev(a2, "class", "navbar-item");
    			attr_dev(a2, "href", "https://bulma.io");
    			add_location(a2, file$5, 37, 10, 950);
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$5, 54, 12, 1442);
    			attr_dev(span1, "aria-hidden", "true");
    			add_location(span1, file$5, 55, 12, 1483);
    			attr_dev(span2, "aria-hidden", "true");
    			add_location(span2, file$5, 56, 12, 1524);
    			attr_dev(a3, "role", "button");
    			attr_dev(a3, "href", "https://bulma.io/");
    			attr_dev(a3, "class", "navbar-burger");
    			attr_dev(a3, "aria-label", "menu");
    			attr_dev(a3, "aria-expanded", "false");
    			attr_dev(a3, "data-target", "navbarBasicExample");
    			add_location(a3, file$5, 46, 10, 1201);
    			attr_dev(div1, "class", "navbar-brand");
    			add_location(div1, file$5, 36, 8, 912);
    			attr_dev(a4, "class", "button is-light");
    			attr_dev(a4, "href", "https://bulma.io/");
    			add_location(a4, file$5, 63, 14, 1707);
    			attr_dev(div2, "class", "buttons");
    			add_location(div2, file$5, 62, 12, 1670);
    			attr_dev(div3, "class", "navbar-item");
    			add_location(div3, file$5, 61, 10, 1631);
    			attr_dev(div4, "class", "navbar-end");
    			add_location(div4, file$5, 60, 8, 1595);
    			attr_dev(div5, "class", "navbar-start");
    			add_location(div5, file$5, 33, 6, 798);
    			add_location(strong0, file$5, 79, 14, 2152);
    			attr_dev(a5, "href", "https://github.com/Ansh-Sarkar");
    			attr_dev(a5, "class", "button is-primary");
    			attr_dev(a5, "target", "_blank");
    			add_location(a5, file$5, 74, 12, 1994);
    			add_location(strong1, file$5, 86, 14, 2375);
    			attr_dev(a6, "href", "https://www.linkedin.com/in/ansh-sarkar/");
    			attr_dev(a6, "class", "button is-primary");
    			attr_dev(a6, "target", "_blank");
    			add_location(a6, file$5, 81, 12, 2207);
    			attr_dev(div6, "class", "buttons");
    			add_location(div6, file$5, 73, 10, 1959);
    			attr_dev(div7, "class", "navbar-item");
    			add_location(div7, file$5, 72, 8, 1922);
    			attr_dev(div8, "class", "navbar-end");
    			add_location(div8, file$5, 71, 6, 1888);
    			attr_dev(div9, "id", "navbarBasicExample");
    			attr_dev(div9, "class", "navbar-menu");
    			add_location(div9, file$5, 32, 4, 741);
    			attr_dev(nav, "class", "navbar mt-5");
    			attr_dev(nav, "role", "navigation");
    			attr_dev(nav, "aria-label", "main navigation");
    			set_style(nav, "border-radius", "10px");
    			add_location(nav, file$5, 26, 2, 610);
    			attr_dev(div10, "class", "initial svelte-1c86hlr");
    			add_location(div10, file$5, 13, 0, 275);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div10, anchor);
    			append_dev(div10, div0);
    			append_dev(div0, a0);
    			mount_component(githubicon, a0, null);
    			append_dev(div0, t0);
    			append_dev(div0, h2);
    			append_dev(div0, t2);
    			append_dev(div0, input);
    			set_input_value(input, /*username*/ ctx[0]);
    			append_dev(div10, t3);
    			append_dev(div10, nav);
    			append_dev(nav, div9);
    			append_dev(div9, div5);
    			append_dev(div5, a1);
    			append_dev(div5, t5);
    			append_dev(div5, div1);
    			append_dev(div1, a2);
    			append_dev(a2, img);
    			append_dev(div1, t6);
    			append_dev(div1, a3);
    			append_dev(a3, span0);
    			append_dev(a3, t7);
    			append_dev(a3, span1);
    			append_dev(a3, t8);
    			append_dev(a3, span2);
    			append_dev(div5, t9);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, a4);
    			append_dev(div9, t11);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, a5);
    			append_dev(a5, strong0);
    			append_dev(div6, t13);
    			append_dev(div6, a6);
    			append_dev(a6, strong1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[2]),
    					listen_dev(input, "keyup", /*handleKeyPress*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*username*/ 1 && input.value !== /*username*/ ctx[0]) {
    				set_input_value(input, /*username*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(githubicon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(githubicon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div10);
    			destroy_component(githubicon);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Home", slots, []);
    	let username;

    	const handleKeyPress = event => {
    		if (event.keyCode == 13) {
    			if (username) {
    				window.location.href += "#/users/" + username;
    			}
    		}
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		username = this.value;
    		$$invalidate(0, username);
    	}

    	$$self.$capture_state = () => ({ GithubIcon, username, handleKeyPress });

    	$$self.$inject_state = $$props => {
    		if ("username" in $$props) $$invalidate(0, username = $$props.username);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [username, handleKeyPress, input_input_handler];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    function getUserAgent() {
        if (typeof navigator === "object" && "userAgent" in navigator) {
            return navigator.userAgent;
        }
        if (typeof process === "object" && "version" in process) {
            return `Node.js/${process.version.substr(1)} (${process.platform}; ${process.arch})`;
        }
        return "<environment undetectable>";
    }

    var register_1 = register;

    function register(state, name, method, options) {
      if (typeof method !== "function") {
        throw new Error("method for before hook must be a function");
      }

      if (!options) {
        options = {};
      }

      if (Array.isArray(name)) {
        return name.reverse().reduce(function (callback, name) {
          return register.bind(null, state, name, callback, options);
        }, method)();
      }

      return Promise.resolve().then(function () {
        if (!state.registry[name]) {
          return method(options);
        }

        return state.registry[name].reduce(function (method, registered) {
          return registered.hook.bind(null, method, options);
        }, method)();
      });
    }

    var add = addHook;

    function addHook(state, kind, name, hook) {
      var orig = hook;
      if (!state.registry[name]) {
        state.registry[name] = [];
      }

      if (kind === "before") {
        hook = function (method, options) {
          return Promise.resolve()
            .then(orig.bind(null, options))
            .then(method.bind(null, options));
        };
      }

      if (kind === "after") {
        hook = function (method, options) {
          var result;
          return Promise.resolve()
            .then(method.bind(null, options))
            .then(function (result_) {
              result = result_;
              return orig(result, options);
            })
            .then(function () {
              return result;
            });
        };
      }

      if (kind === "error") {
        hook = function (method, options) {
          return Promise.resolve()
            .then(method.bind(null, options))
            .catch(function (error) {
              return orig(error, options);
            });
        };
      }

      state.registry[name].push({
        hook: hook,
        orig: orig,
      });
    }

    var remove = removeHook;

    function removeHook(state, name, method) {
      if (!state.registry[name]) {
        return;
      }

      var index = state.registry[name]
        .map(function (registered) {
          return registered.orig;
        })
        .indexOf(method);

      if (index === -1) {
        return;
      }

      state.registry[name].splice(index, 1);
    }

    // bind with array of arguments: https://stackoverflow.com/a/21792913
    var bind = Function.bind;
    var bindable = bind.bind(bind);

    function bindApi (hook, state, name) {
      var removeHookRef = bindable(remove, null).apply(null, name ? [state, name] : [state]);
      hook.api = { remove: removeHookRef };
      hook.remove = removeHookRef

      ;['before', 'error', 'after', 'wrap'].forEach(function (kind) {
        var args = name ? [state, kind, name] : [state, kind];
        hook[kind] = hook.api[kind] = bindable(add, null).apply(null, args);
      });
    }

    function HookSingular () {
      var singularHookName = 'h';
      var singularHookState = {
        registry: {}
      };
      var singularHook = register_1.bind(null, singularHookState, singularHookName);
      bindApi(singularHook, singularHookState, singularHookName);
      return singularHook
    }

    function HookCollection () {
      var state = {
        registry: {}
      };

      var hook = register_1.bind(null, state);
      bindApi(hook, state);

      return hook
    }

    var collectionHookDeprecationMessageDisplayed = false;
    function Hook () {
      if (!collectionHookDeprecationMessageDisplayed) {
        console.warn('[before-after-hook]: "Hook()" repurposing warning, use "Hook.Collection()". Read more: https://git.io/upgrade-before-after-hook-to-1.4');
        collectionHookDeprecationMessageDisplayed = true;
      }
      return HookCollection()
    }

    Hook.Singular = HookSingular.bind();
    Hook.Collection = HookCollection.bind();

    var beforeAfterHook = Hook;
    // expose constructors as a named property for TypeScript
    var Hook_1 = Hook;
    var Singular = Hook.Singular;
    var Collection = Hook.Collection;
    beforeAfterHook.Hook = Hook_1;
    beforeAfterHook.Singular = Singular;
    beforeAfterHook.Collection = Collection;

    /*!
     * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
     *
     * Copyright (c) 2014-2017, Jon Schlinkert.
     * Released under the MIT License.
     */

    function isObject(o) {
      return Object.prototype.toString.call(o) === '[object Object]';
    }

    function isPlainObject(o) {
      var ctor,prot;

      if (isObject(o) === false) return false;

      // If has modified constructor
      ctor = o.constructor;
      if (ctor === undefined) return true;

      // If has modified prototype
      prot = ctor.prototype;
      if (isObject(prot) === false) return false;

      // If constructor does not have an Object-specific method
      if (prot.hasOwnProperty('isPrototypeOf') === false) {
        return false;
      }

      // Most likely a plain Object
      return true;
    }

    function lowercaseKeys(object) {
        if (!object) {
            return {};
        }
        return Object.keys(object).reduce((newObj, key) => {
            newObj[key.toLowerCase()] = object[key];
            return newObj;
        }, {});
    }

    function mergeDeep(defaults, options) {
        const result = Object.assign({}, defaults);
        Object.keys(options).forEach((key) => {
            if (isPlainObject(options[key])) {
                if (!(key in defaults))
                    Object.assign(result, { [key]: options[key] });
                else
                    result[key] = mergeDeep(defaults[key], options[key]);
            }
            else {
                Object.assign(result, { [key]: options[key] });
            }
        });
        return result;
    }

    function removeUndefinedProperties(obj) {
        for (const key in obj) {
            if (obj[key] === undefined) {
                delete obj[key];
            }
        }
        return obj;
    }

    function merge(defaults, route, options) {
        if (typeof route === "string") {
            let [method, url] = route.split(" ");
            options = Object.assign(url ? { method, url } : { url: method }, options);
        }
        else {
            options = Object.assign({}, route);
        }
        // lowercase header names before merging with defaults to avoid duplicates
        options.headers = lowercaseKeys(options.headers);
        // remove properties with undefined values before merging
        removeUndefinedProperties(options);
        removeUndefinedProperties(options.headers);
        const mergedOptions = mergeDeep(defaults || {}, options);
        // mediaType.previews arrays are merged, instead of overwritten
        if (defaults && defaults.mediaType.previews.length) {
            mergedOptions.mediaType.previews = defaults.mediaType.previews
                .filter((preview) => !mergedOptions.mediaType.previews.includes(preview))
                .concat(mergedOptions.mediaType.previews);
        }
        mergedOptions.mediaType.previews = mergedOptions.mediaType.previews.map((preview) => preview.replace(/-preview/, ""));
        return mergedOptions;
    }

    function addQueryParameters(url, parameters) {
        const separator = /\?/.test(url) ? "&" : "?";
        const names = Object.keys(parameters);
        if (names.length === 0) {
            return url;
        }
        return (url +
            separator +
            names
                .map((name) => {
                if (name === "q") {
                    return ("q=" + parameters.q.split("+").map(encodeURIComponent).join("+"));
                }
                return `${name}=${encodeURIComponent(parameters[name])}`;
            })
                .join("&"));
    }

    const urlVariableRegex = /\{[^}]+\}/g;
    function removeNonChars(variableName) {
        return variableName.replace(/^\W+|\W+$/g, "").split(/,/);
    }
    function extractUrlVariableNames(url) {
        const matches = url.match(urlVariableRegex);
        if (!matches) {
            return [];
        }
        return matches.map(removeNonChars).reduce((a, b) => a.concat(b), []);
    }

    function omit(object, keysToOmit) {
        return Object.keys(object)
            .filter((option) => !keysToOmit.includes(option))
            .reduce((obj, key) => {
            obj[key] = object[key];
            return obj;
        }, {});
    }

    // Based on https://github.com/bramstein/url-template, licensed under BSD
    // TODO: create separate package.
    //
    // Copyright (c) 2012-2014, Bram Stein
    // All rights reserved.
    // Redistribution and use in source and binary forms, with or without
    // modification, are permitted provided that the following conditions
    // are met:
    //  1. Redistributions of source code must retain the above copyright
    //     notice, this list of conditions and the following disclaimer.
    //  2. Redistributions in binary form must reproduce the above copyright
    //     notice, this list of conditions and the following disclaimer in the
    //     documentation and/or other materials provided with the distribution.
    //  3. The name of the author may not be used to endorse or promote products
    //     derived from this software without specific prior written permission.
    // THIS SOFTWARE IS PROVIDED BY THE AUTHOR "AS IS" AND ANY EXPRESS OR IMPLIED
    // WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
    // MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
    // EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
    // INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
    // BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
    // DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
    // OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
    // NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
    // EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
    /* istanbul ignore file */
    function encodeReserved(str) {
        return str
            .split(/(%[0-9A-Fa-f]{2})/g)
            .map(function (part) {
            if (!/%[0-9A-Fa-f]/.test(part)) {
                part = encodeURI(part).replace(/%5B/g, "[").replace(/%5D/g, "]");
            }
            return part;
        })
            .join("");
    }
    function encodeUnreserved(str) {
        return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
            return "%" + c.charCodeAt(0).toString(16).toUpperCase();
        });
    }
    function encodeValue(operator, value, key) {
        value =
            operator === "+" || operator === "#"
                ? encodeReserved(value)
                : encodeUnreserved(value);
        if (key) {
            return encodeUnreserved(key) + "=" + value;
        }
        else {
            return value;
        }
    }
    function isDefined(value) {
        return value !== undefined && value !== null;
    }
    function isKeyOperator(operator) {
        return operator === ";" || operator === "&" || operator === "?";
    }
    function getValues(context, operator, key, modifier) {
        var value = context[key], result = [];
        if (isDefined(value) && value !== "") {
            if (typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean") {
                value = value.toString();
                if (modifier && modifier !== "*") {
                    value = value.substring(0, parseInt(modifier, 10));
                }
                result.push(encodeValue(operator, value, isKeyOperator(operator) ? key : ""));
            }
            else {
                if (modifier === "*") {
                    if (Array.isArray(value)) {
                        value.filter(isDefined).forEach(function (value) {
                            result.push(encodeValue(operator, value, isKeyOperator(operator) ? key : ""));
                        });
                    }
                    else {
                        Object.keys(value).forEach(function (k) {
                            if (isDefined(value[k])) {
                                result.push(encodeValue(operator, value[k], k));
                            }
                        });
                    }
                }
                else {
                    const tmp = [];
                    if (Array.isArray(value)) {
                        value.filter(isDefined).forEach(function (value) {
                            tmp.push(encodeValue(operator, value));
                        });
                    }
                    else {
                        Object.keys(value).forEach(function (k) {
                            if (isDefined(value[k])) {
                                tmp.push(encodeUnreserved(k));
                                tmp.push(encodeValue(operator, value[k].toString()));
                            }
                        });
                    }
                    if (isKeyOperator(operator)) {
                        result.push(encodeUnreserved(key) + "=" + tmp.join(","));
                    }
                    else if (tmp.length !== 0) {
                        result.push(tmp.join(","));
                    }
                }
            }
        }
        else {
            if (operator === ";") {
                if (isDefined(value)) {
                    result.push(encodeUnreserved(key));
                }
            }
            else if (value === "" && (operator === "&" || operator === "?")) {
                result.push(encodeUnreserved(key) + "=");
            }
            else if (value === "") {
                result.push("");
            }
        }
        return result;
    }
    function parseUrl(template) {
        return {
            expand: expand.bind(null, template),
        };
    }
    function expand(template, context) {
        var operators = ["+", "#", ".", "/", ";", "?", "&"];
        return template.replace(/\{([^\{\}]+)\}|([^\{\}]+)/g, function (_, expression, literal) {
            if (expression) {
                let operator = "";
                const values = [];
                if (operators.indexOf(expression.charAt(0)) !== -1) {
                    operator = expression.charAt(0);
                    expression = expression.substr(1);
                }
                expression.split(/,/g).forEach(function (variable) {
                    var tmp = /([^:\*]*)(?::(\d+)|(\*))?/.exec(variable);
                    values.push(getValues(context, operator, tmp[1], tmp[2] || tmp[3]));
                });
                if (operator && operator !== "+") {
                    var separator = ",";
                    if (operator === "?") {
                        separator = "&";
                    }
                    else if (operator !== "#") {
                        separator = operator;
                    }
                    return (values.length !== 0 ? operator : "") + values.join(separator);
                }
                else {
                    return values.join(",");
                }
            }
            else {
                return encodeReserved(literal);
            }
        });
    }

    function parse(options) {
        // https://fetch.spec.whatwg.org/#methods
        let method = options.method.toUpperCase();
        // replace :varname with {varname} to make it RFC 6570 compatible
        let url = (options.url || "/").replace(/:([a-z]\w+)/g, "{$1}");
        let headers = Object.assign({}, options.headers);
        let body;
        let parameters = omit(options, [
            "method",
            "baseUrl",
            "url",
            "headers",
            "request",
            "mediaType",
        ]);
        // extract variable names from URL to calculate remaining variables later
        const urlVariableNames = extractUrlVariableNames(url);
        url = parseUrl(url).expand(parameters);
        if (!/^http/.test(url)) {
            url = options.baseUrl + url;
        }
        const omittedParameters = Object.keys(options)
            .filter((option) => urlVariableNames.includes(option))
            .concat("baseUrl");
        const remainingParameters = omit(parameters, omittedParameters);
        const isBinaryRequest = /application\/octet-stream/i.test(headers.accept);
        if (!isBinaryRequest) {
            if (options.mediaType.format) {
                // e.g. application/vnd.github.v3+json => application/vnd.github.v3.raw
                headers.accept = headers.accept
                    .split(/,/)
                    .map((preview) => preview.replace(/application\/vnd(\.\w+)(\.v3)?(\.\w+)?(\+json)?$/, `application/vnd$1$2.${options.mediaType.format}`))
                    .join(",");
            }
            if (options.mediaType.previews.length) {
                const previewsFromAcceptHeader = headers.accept.match(/[\w-]+(?=-preview)/g) || [];
                headers.accept = previewsFromAcceptHeader
                    .concat(options.mediaType.previews)
                    .map((preview) => {
                    const format = options.mediaType.format
                        ? `.${options.mediaType.format}`
                        : "+json";
                    return `application/vnd.github.${preview}-preview${format}`;
                })
                    .join(",");
            }
        }
        // for GET/HEAD requests, set URL query parameters from remaining parameters
        // for PATCH/POST/PUT/DELETE requests, set request body from remaining parameters
        if (["GET", "HEAD"].includes(method)) {
            url = addQueryParameters(url, remainingParameters);
        }
        else {
            if ("data" in remainingParameters) {
                body = remainingParameters.data;
            }
            else {
                if (Object.keys(remainingParameters).length) {
                    body = remainingParameters;
                }
                else {
                    headers["content-length"] = 0;
                }
            }
        }
        // default content-type for JSON if body is set
        if (!headers["content-type"] && typeof body !== "undefined") {
            headers["content-type"] = "application/json; charset=utf-8";
        }
        // GitHub expects 'content-length: 0' header for PUT/PATCH requests without body.
        // fetch does not allow to set `content-length` header, but we can set body to an empty string
        if (["PATCH", "PUT"].includes(method) && typeof body === "undefined") {
            body = "";
        }
        // Only return body/request keys if present
        return Object.assign({ method, url, headers }, typeof body !== "undefined" ? { body } : null, options.request ? { request: options.request } : null);
    }

    function endpointWithDefaults(defaults, route, options) {
        return parse(merge(defaults, route, options));
    }

    function withDefaults$2(oldDefaults, newDefaults) {
        const DEFAULTS = merge(oldDefaults, newDefaults);
        const endpoint = endpointWithDefaults.bind(null, DEFAULTS);
        return Object.assign(endpoint, {
            DEFAULTS,
            defaults: withDefaults$2.bind(null, DEFAULTS),
            merge: merge.bind(null, DEFAULTS),
            parse,
        });
    }

    const VERSION$7 = "6.0.11";

    const userAgent = `octokit-endpoint.js/${VERSION$7} ${getUserAgent()}`;
    // DEFAULTS has all properties set that EndpointOptions has, except url.
    // So we use RequestParameters and add method as additional required property.
    const DEFAULTS = {
        method: "GET",
        baseUrl: "https://api.github.com",
        headers: {
            accept: "application/vnd.github.v3+json",
            "user-agent": userAgent,
        },
        mediaType: {
            format: "",
            previews: [],
        },
    };

    const endpoint = withDefaults$2(null, DEFAULTS);

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var browser = createCommonjsModule(function (module, exports) {

    // ref: https://github.com/tc39/proposal-global
    var getGlobal = function () {
    	// the only reliable means to get the global object is
    	// `Function('return this')()`
    	// However, this causes CSP violations in Chrome apps.
    	if (typeof self !== 'undefined') { return self; }
    	if (typeof window !== 'undefined') { return window; }
    	if (typeof global !== 'undefined') { return global; }
    	throw new Error('unable to locate global object');
    };

    var global = getGlobal();

    module.exports = exports = global.fetch;

    // Needed for TypeScript and Webpack.
    if (global.fetch) {
    	exports.default = global.fetch.bind(global);
    }

    exports.Headers = global.Headers;
    exports.Request = global.Request;
    exports.Response = global.Response;
    });

    class Deprecation extends Error {
      constructor(message) {
        super(message); // Maintains proper stack trace (only available on V8)

        /* istanbul ignore next */

        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, this.constructor);
        }

        this.name = 'Deprecation';
      }

    }

    // Returns a wrapper function that returns a wrapped callback
    // The wrapper function should do some stuff, and return a
    // presumably different callback function.
    // This makes sure that own properties are retained, so that
    // decorations and such are not lost along the way.
    var wrappy_1 = wrappy;
    function wrappy (fn, cb) {
      if (fn && cb) return wrappy(fn)(cb)

      if (typeof fn !== 'function')
        throw new TypeError('need wrapper function')

      Object.keys(fn).forEach(function (k) {
        wrapper[k] = fn[k];
      });

      return wrapper

      function wrapper() {
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        var ret = fn.apply(this, args);
        var cb = args[args.length-1];
        if (typeof ret === 'function' && ret !== cb) {
          Object.keys(cb).forEach(function (k) {
            ret[k] = cb[k];
          });
        }
        return ret
      }
    }

    var once_1 = wrappy_1(once);
    var strict = wrappy_1(onceStrict);

    once.proto = once(function () {
      Object.defineProperty(Function.prototype, 'once', {
        value: function () {
          return once(this)
        },
        configurable: true
      });

      Object.defineProperty(Function.prototype, 'onceStrict', {
        value: function () {
          return onceStrict(this)
        },
        configurable: true
      });
    });

    function once (fn) {
      var f = function () {
        if (f.called) return f.value
        f.called = true;
        return f.value = fn.apply(this, arguments)
      };
      f.called = false;
      return f
    }

    function onceStrict (fn) {
      var f = function () {
        if (f.called)
          throw new Error(f.onceError)
        f.called = true;
        return f.value = fn.apply(this, arguments)
      };
      var name = fn.name || 'Function wrapped with `once`';
      f.onceError = name + " shouldn't be called more than once";
      f.called = false;
      return f
    }
    once_1.strict = strict;

    const logOnce = once_1((deprecation) => console.warn(deprecation));
    /**
     * Error with extra properties to help with debugging
     */
    class RequestError extends Error {
        constructor(message, statusCode, options) {
            super(message);
            // Maintains proper stack trace (only available on V8)
            /* istanbul ignore next */
            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, this.constructor);
            }
            this.name = "HttpError";
            this.status = statusCode;
            Object.defineProperty(this, "code", {
                get() {
                    logOnce(new Deprecation("[@octokit/request-error] `error.code` is deprecated, use `error.status`."));
                    return statusCode;
                },
            });
            this.headers = options.headers || {};
            // redact request credentials without mutating original request options
            const requestCopy = Object.assign({}, options.request);
            if (options.request.headers.authorization) {
                requestCopy.headers = Object.assign({}, options.request.headers, {
                    authorization: options.request.headers.authorization.replace(/ .*$/, " [REDACTED]"),
                });
            }
            requestCopy.url = requestCopy.url
                // client_id & client_secret can be passed as URL query parameters to increase rate limit
                // see https://developer.github.com/v3/#increasing-the-unauthenticated-rate-limit-for-oauth-applications
                .replace(/\bclient_secret=\w+/g, "client_secret=[REDACTED]")
                // OAuth tokens can be passed as URL query parameters, although it is not recommended
                // see https://developer.github.com/v3/#oauth2-token-sent-in-a-header
                .replace(/\baccess_token=\w+/g, "access_token=[REDACTED]");
            this.request = requestCopy;
        }
    }

    const VERSION$6 = "5.4.15";

    function getBufferResponse(response) {
        return response.arrayBuffer();
    }

    function fetchWrapper(requestOptions) {
        if (isPlainObject(requestOptions.body) ||
            Array.isArray(requestOptions.body)) {
            requestOptions.body = JSON.stringify(requestOptions.body);
        }
        let headers = {};
        let status;
        let url;
        const fetch = (requestOptions.request && requestOptions.request.fetch) || browser;
        return fetch(requestOptions.url, Object.assign({
            method: requestOptions.method,
            body: requestOptions.body,
            headers: requestOptions.headers,
            redirect: requestOptions.redirect,
        }, 
        // `requestOptions.request.agent` type is incompatible
        // see https://github.com/octokit/types.ts/pull/264
        requestOptions.request))
            .then((response) => {
            url = response.url;
            status = response.status;
            for (const keyAndValue of response.headers) {
                headers[keyAndValue[0]] = keyAndValue[1];
            }
            if (status === 204 || status === 205) {
                return;
            }
            // GitHub API returns 200 for HEAD requests
            if (requestOptions.method === "HEAD") {
                if (status < 400) {
                    return;
                }
                throw new RequestError(response.statusText, status, {
                    headers,
                    request: requestOptions,
                });
            }
            if (status === 304) {
                throw new RequestError("Not modified", status, {
                    headers,
                    request: requestOptions,
                });
            }
            if (status >= 400) {
                return response
                    .text()
                    .then((message) => {
                    const error = new RequestError(message, status, {
                        headers,
                        request: requestOptions,
                    });
                    try {
                        let responseBody = JSON.parse(error.message);
                        Object.assign(error, responseBody);
                        let errors = responseBody.errors;
                        // Assumption `errors` would always be in Array format
                        error.message =
                            error.message + ": " + errors.map(JSON.stringify).join(", ");
                    }
                    catch (e) {
                        // ignore, see octokit/rest.js#684
                    }
                    throw error;
                });
            }
            const contentType = response.headers.get("content-type");
            if (/application\/json/.test(contentType)) {
                return response.json();
            }
            if (!contentType || /^text\/|charset=utf-8$/.test(contentType)) {
                return response.text();
            }
            return getBufferResponse(response);
        })
            .then((data) => {
            return {
                status,
                url,
                headers,
                data,
            };
        })
            .catch((error) => {
            if (error instanceof RequestError) {
                throw error;
            }
            throw new RequestError(error.message, 500, {
                headers,
                request: requestOptions,
            });
        });
    }

    function withDefaults$1(oldEndpoint, newDefaults) {
        const endpoint = oldEndpoint.defaults(newDefaults);
        const newApi = function (route, parameters) {
            const endpointOptions = endpoint.merge(route, parameters);
            if (!endpointOptions.request || !endpointOptions.request.hook) {
                return fetchWrapper(endpoint.parse(endpointOptions));
            }
            const request = (route, parameters) => {
                return fetchWrapper(endpoint.parse(endpoint.merge(route, parameters)));
            };
            Object.assign(request, {
                endpoint,
                defaults: withDefaults$1.bind(null, endpoint),
            });
            return endpointOptions.request.hook(request, endpointOptions);
        };
        return Object.assign(newApi, {
            endpoint,
            defaults: withDefaults$1.bind(null, endpoint),
        });
    }

    const request = withDefaults$1(endpoint, {
        headers: {
            "user-agent": `octokit-request.js/${VERSION$6} ${getUserAgent()}`,
        },
    });

    const VERSION$5 = "4.6.1";

    class GraphqlError extends Error {
        constructor(request, response) {
            const message = response.data.errors[0].message;
            super(message);
            Object.assign(this, response.data);
            Object.assign(this, { headers: response.headers });
            this.name = "GraphqlError";
            this.request = request;
            // Maintains proper stack trace (only available on V8)
            /* istanbul ignore next */
            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, this.constructor);
            }
        }
    }

    const NON_VARIABLE_OPTIONS = [
        "method",
        "baseUrl",
        "url",
        "headers",
        "request",
        "query",
        "mediaType",
    ];
    const FORBIDDEN_VARIABLE_OPTIONS = ["query", "method", "url"];
    const GHES_V3_SUFFIX_REGEX = /\/api\/v3\/?$/;
    function graphql(request, query, options) {
        if (options) {
            if (typeof query === "string" && "query" in options) {
                return Promise.reject(new Error(`[@octokit/graphql] "query" cannot be used as variable name`));
            }
            for (const key in options) {
                if (!FORBIDDEN_VARIABLE_OPTIONS.includes(key))
                    continue;
                return Promise.reject(new Error(`[@octokit/graphql] "${key}" cannot be used as variable name`));
            }
        }
        const parsedOptions = typeof query === "string" ? Object.assign({ query }, options) : query;
        const requestOptions = Object.keys(parsedOptions).reduce((result, key) => {
            if (NON_VARIABLE_OPTIONS.includes(key)) {
                result[key] = parsedOptions[key];
                return result;
            }
            if (!result.variables) {
                result.variables = {};
            }
            result.variables[key] = parsedOptions[key];
            return result;
        }, {});
        // workaround for GitHub Enterprise baseUrl set with /api/v3 suffix
        // https://github.com/octokit/auth-app.js/issues/111#issuecomment-657610451
        const baseUrl = parsedOptions.baseUrl || request.endpoint.DEFAULTS.baseUrl;
        if (GHES_V3_SUFFIX_REGEX.test(baseUrl)) {
            requestOptions.url = baseUrl.replace(GHES_V3_SUFFIX_REGEX, "/api/graphql");
        }
        return request(requestOptions).then((response) => {
            if (response.data.errors) {
                const headers = {};
                for (const key of Object.keys(response.headers)) {
                    headers[key] = response.headers[key];
                }
                throw new GraphqlError(requestOptions, {
                    headers,
                    data: response.data,
                });
            }
            return response.data.data;
        });
    }

    function withDefaults(request$1, newDefaults) {
        const newRequest = request$1.defaults(newDefaults);
        const newApi = (query, options) => {
            return graphql(newRequest, query, options);
        };
        return Object.assign(newApi, {
            defaults: withDefaults.bind(null, newRequest),
            endpoint: request.endpoint,
        });
    }

    withDefaults(request, {
        headers: {
            "user-agent": `octokit-graphql.js/${VERSION$5} ${getUserAgent()}`,
        },
        method: "POST",
        url: "/graphql",
    });
    function withCustomRequest(customRequest) {
        return withDefaults(customRequest, {
            method: "POST",
            url: "/graphql",
        });
    }

    async function auth(token) {
        const tokenType = token.split(/\./).length === 3
            ? "app"
            : /^v\d+\./.test(token)
                ? "installation"
                : "oauth";
        return {
            type: "token",
            token: token,
            tokenType
        };
    }

    /**
     * Prefix token for usage in the Authorization header
     *
     * @param token OAuth token or JSON Web Token
     */
    function withAuthorizationPrefix(token) {
        if (token.split(/\./).length === 3) {
            return `bearer ${token}`;
        }
        return `token ${token}`;
    }

    async function hook(token, request, route, parameters) {
        const endpoint = request.endpoint.merge(route, parameters);
        endpoint.headers.authorization = withAuthorizationPrefix(token);
        return request(endpoint);
    }

    const createTokenAuth = function createTokenAuth(token) {
        if (!token) {
            throw new Error("[@octokit/auth-token] No token passed to createTokenAuth");
        }
        if (typeof token !== "string") {
            throw new Error("[@octokit/auth-token] Token passed to createTokenAuth is not a string");
        }
        token = token.replace(/^(token|bearer) +/i, "");
        return Object.assign(auth.bind(null, token), {
            hook: hook.bind(null, token)
        });
    };

    const VERSION$4 = "3.4.0";

    class Octokit$1 {
        constructor(options = {}) {
            const hook = new Collection();
            const requestDefaults = {
                baseUrl: request.endpoint.DEFAULTS.baseUrl,
                headers: {},
                request: Object.assign({}, options.request, {
                    // @ts-ignore internal usage only, no need to type
                    hook: hook.bind(null, "request"),
                }),
                mediaType: {
                    previews: [],
                    format: "",
                },
            };
            // prepend default user agent with `options.userAgent` if set
            requestDefaults.headers["user-agent"] = [
                options.userAgent,
                `octokit-core.js/${VERSION$4} ${getUserAgent()}`,
            ]
                .filter(Boolean)
                .join(" ");
            if (options.baseUrl) {
                requestDefaults.baseUrl = options.baseUrl;
            }
            if (options.previews) {
                requestDefaults.mediaType.previews = options.previews;
            }
            if (options.timeZone) {
                requestDefaults.headers["time-zone"] = options.timeZone;
            }
            this.request = request.defaults(requestDefaults);
            this.graphql = withCustomRequest(this.request).defaults(requestDefaults);
            this.log = Object.assign({
                debug: () => { },
                info: () => { },
                warn: console.warn.bind(console),
                error: console.error.bind(console),
            }, options.log);
            this.hook = hook;
            // (1) If neither `options.authStrategy` nor `options.auth` are set, the `octokit` instance
            //     is unauthenticated. The `this.auth()` method is a no-op and no request hook is registered.
            // (2) If only `options.auth` is set, use the default token authentication strategy.
            // (3) If `options.authStrategy` is set then use it and pass in `options.auth`. Always pass own request as many strategies accept a custom request instance.
            // TODO: type `options.auth` based on `options.authStrategy`.
            if (!options.authStrategy) {
                if (!options.auth) {
                    // (1)
                    this.auth = async () => ({
                        type: "unauthenticated",
                    });
                }
                else {
                    // (2)
                    const auth = createTokenAuth(options.auth);
                    // @ts-ignore  ¯\_(ツ)_/¯
                    hook.wrap("request", auth.hook);
                    this.auth = auth;
                }
            }
            else {
                const { authStrategy, ...otherOptions } = options;
                const auth = authStrategy(Object.assign({
                    request: this.request,
                    log: this.log,
                    // we pass the current octokit instance as well as its constructor options
                    // to allow for authentication strategies that return a new octokit instance
                    // that shares the same internal state as the current one. The original
                    // requirement for this was the "event-octokit" authentication strategy
                    // of https://github.com/probot/octokit-auth-probot.
                    octokit: this,
                    octokitOptions: otherOptions,
                }, options.auth));
                // @ts-ignore  ¯\_(ツ)_/¯
                hook.wrap("request", auth.hook);
                this.auth = auth;
            }
            // apply plugins
            // https://stackoverflow.com/a/16345172
            const classConstructor = this.constructor;
            classConstructor.plugins.forEach((plugin) => {
                Object.assign(this, plugin(this, options));
            });
        }
        static defaults(defaults) {
            const OctokitWithDefaults = class extends this {
                constructor(...args) {
                    const options = args[0] || {};
                    if (typeof defaults === "function") {
                        super(defaults(options));
                        return;
                    }
                    super(Object.assign({}, defaults, options, options.userAgent && defaults.userAgent
                        ? {
                            userAgent: `${options.userAgent} ${defaults.userAgent}`,
                        }
                        : null));
                }
            };
            return OctokitWithDefaults;
        }
        /**
         * Attach a plugin (or many) to your Octokit instance.
         *
         * @example
         * const API = Octokit.plugin(plugin1, plugin2, plugin3, ...)
         */
        static plugin(...newPlugins) {
            var _a;
            const currentPlugins = this.plugins;
            const NewOctokit = (_a = class extends this {
                },
                _a.plugins = currentPlugins.concat(newPlugins.filter((plugin) => !currentPlugins.includes(plugin))),
                _a);
            return NewOctokit;
        }
    }
    Octokit$1.VERSION = VERSION$4;
    Octokit$1.plugins = [];

    const VERSION$3 = "1.0.3";

    /**
     * @param octokit Octokit instance
     * @param options Options passed to Octokit constructor
     */
    function requestLog(octokit) {
        octokit.hook.wrap("request", (request, options) => {
            octokit.log.debug("request", options);
            const start = Date.now();
            const requestOptions = octokit.request.endpoint.parse(options);
            const path = requestOptions.url.replace(options.baseUrl, "");
            return request(options)
                .then((response) => {
                octokit.log.info(`${requestOptions.method} ${path} - ${response.status} in ${Date.now() - start}ms`);
                return response;
            })
                .catch((error) => {
                octokit.log.info(`${requestOptions.method} ${path} - ${error.status} in ${Date.now() - start}ms`);
                throw error;
            });
        });
    }
    requestLog.VERSION = VERSION$3;

    const VERSION$2 = "2.13.3";

    /**
     * Some “list” response that can be paginated have a different response structure
     *
     * They have a `total_count` key in the response (search also has `incomplete_results`,
     * /installation/repositories also has `repository_selection`), as well as a key with
     * the list of the items which name varies from endpoint to endpoint.
     *
     * Octokit normalizes these responses so that paginated results are always returned following
     * the same structure. One challenge is that if the list response has only one page, no Link
     * header is provided, so this header alone is not sufficient to check wether a response is
     * paginated or not.
     *
     * We check if a "total_count" key is present in the response data, but also make sure that
     * a "url" property is not, as the "Get the combined status for a specific ref" endpoint would
     * otherwise match: https://developer.github.com/v3/repos/statuses/#get-the-combined-status-for-a-specific-ref
     */
    function normalizePaginatedListResponse(response) {
        const responseNeedsNormalization = "total_count" in response.data && !("url" in response.data);
        if (!responseNeedsNormalization)
            return response;
        // keep the additional properties intact as there is currently no other way
        // to retrieve the same information.
        const incompleteResults = response.data.incomplete_results;
        const repositorySelection = response.data.repository_selection;
        const totalCount = response.data.total_count;
        delete response.data.incomplete_results;
        delete response.data.repository_selection;
        delete response.data.total_count;
        const namespaceKey = Object.keys(response.data)[0];
        const data = response.data[namespaceKey];
        response.data = data;
        if (typeof incompleteResults !== "undefined") {
            response.data.incomplete_results = incompleteResults;
        }
        if (typeof repositorySelection !== "undefined") {
            response.data.repository_selection = repositorySelection;
        }
        response.data.total_count = totalCount;
        return response;
    }

    function iterator(octokit, route, parameters) {
        const options = typeof route === "function"
            ? route.endpoint(parameters)
            : octokit.request.endpoint(route, parameters);
        const requestMethod = typeof route === "function" ? route : octokit.request;
        const method = options.method;
        const headers = options.headers;
        let url = options.url;
        return {
            [Symbol.asyncIterator]: () => ({
                async next() {
                    if (!url)
                        return { done: true };
                    const response = await requestMethod({ method, url, headers });
                    const normalizedResponse = normalizePaginatedListResponse(response);
                    // `response.headers.link` format:
                    // '<https://api.github.com/users/aseemk/followers?page=2>; rel="next", <https://api.github.com/users/aseemk/followers?page=2>; rel="last"'
                    // sets `url` to undefined if "next" URL is not present or `link` header is not set
                    url = ((normalizedResponse.headers.link || "").match(/<([^>]+)>;\s*rel="next"/) || [])[1];
                    return { value: normalizedResponse };
                },
            }),
        };
    }

    function paginate(octokit, route, parameters, mapFn) {
        if (typeof parameters === "function") {
            mapFn = parameters;
            parameters = undefined;
        }
        return gather(octokit, [], iterator(octokit, route, parameters)[Symbol.asyncIterator](), mapFn);
    }
    function gather(octokit, results, iterator, mapFn) {
        return iterator.next().then((result) => {
            if (result.done) {
                return results;
            }
            let earlyExit = false;
            function done() {
                earlyExit = true;
            }
            results = results.concat(mapFn ? mapFn(result.value, done) : result.value.data);
            if (earlyExit) {
                return results;
            }
            return gather(octokit, results, iterator, mapFn);
        });
    }

    Object.assign(paginate, {
        iterator,
    });

    /**
     * @param octokit Octokit instance
     * @param options Options passed to Octokit constructor
     */
    function paginateRest(octokit) {
        return {
            paginate: Object.assign(paginate.bind(null, octokit), {
                iterator: iterator.bind(null, octokit),
            }),
        };
    }
    paginateRest.VERSION = VERSION$2;

    const Endpoints = {
        actions: {
            addSelectedRepoToOrgSecret: [
                "PUT /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}",
            ],
            cancelWorkflowRun: [
                "POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel",
            ],
            createOrUpdateEnvironmentSecret: [
                "PUT /repositories/{repository_id}/environments/{environment_name}/secrets/{secret_name}",
            ],
            createOrUpdateOrgSecret: ["PUT /orgs/{org}/actions/secrets/{secret_name}"],
            createOrUpdateRepoSecret: [
                "PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}",
            ],
            createRegistrationTokenForOrg: [
                "POST /orgs/{org}/actions/runners/registration-token",
            ],
            createRegistrationTokenForRepo: [
                "POST /repos/{owner}/{repo}/actions/runners/registration-token",
            ],
            createRemoveTokenForOrg: ["POST /orgs/{org}/actions/runners/remove-token"],
            createRemoveTokenForRepo: [
                "POST /repos/{owner}/{repo}/actions/runners/remove-token",
            ],
            createWorkflowDispatch: [
                "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
            ],
            deleteArtifact: [
                "DELETE /repos/{owner}/{repo}/actions/artifacts/{artifact_id}",
            ],
            deleteEnvironmentSecret: [
                "DELETE /repositories/{repository_id}/environments/{environment_name}/secrets/{secret_name}",
            ],
            deleteOrgSecret: ["DELETE /orgs/{org}/actions/secrets/{secret_name}"],
            deleteRepoSecret: [
                "DELETE /repos/{owner}/{repo}/actions/secrets/{secret_name}",
            ],
            deleteSelfHostedRunnerFromOrg: [
                "DELETE /orgs/{org}/actions/runners/{runner_id}",
            ],
            deleteSelfHostedRunnerFromRepo: [
                "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}",
            ],
            deleteWorkflowRun: ["DELETE /repos/{owner}/{repo}/actions/runs/{run_id}"],
            deleteWorkflowRunLogs: [
                "DELETE /repos/{owner}/{repo}/actions/runs/{run_id}/logs",
            ],
            disableSelectedRepositoryGithubActionsOrganization: [
                "DELETE /orgs/{org}/actions/permissions/repositories/{repository_id}",
            ],
            disableWorkflow: [
                "PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable",
            ],
            downloadArtifact: [
                "GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}",
            ],
            downloadJobLogsForWorkflowRun: [
                "GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs",
            ],
            downloadWorkflowRunLogs: [
                "GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs",
            ],
            enableSelectedRepositoryGithubActionsOrganization: [
                "PUT /orgs/{org}/actions/permissions/repositories/{repository_id}",
            ],
            enableWorkflow: [
                "PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable",
            ],
            getAllowedActionsOrganization: [
                "GET /orgs/{org}/actions/permissions/selected-actions",
            ],
            getAllowedActionsRepository: [
                "GET /repos/{owner}/{repo}/actions/permissions/selected-actions",
            ],
            getArtifact: ["GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}"],
            getEnvironmentPublicKey: [
                "GET /repositories/{repository_id}/environments/{environment_name}/secrets/public-key",
            ],
            getEnvironmentSecret: [
                "GET /repositories/{repository_id}/environments/{environment_name}/secrets/{secret_name}",
            ],
            getGithubActionsPermissionsOrganization: [
                "GET /orgs/{org}/actions/permissions",
            ],
            getGithubActionsPermissionsRepository: [
                "GET /repos/{owner}/{repo}/actions/permissions",
            ],
            getJobForWorkflowRun: ["GET /repos/{owner}/{repo}/actions/jobs/{job_id}"],
            getOrgPublicKey: ["GET /orgs/{org}/actions/secrets/public-key"],
            getOrgSecret: ["GET /orgs/{org}/actions/secrets/{secret_name}"],
            getPendingDeploymentsForRun: [
                "GET /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments",
            ],
            getRepoPermissions: [
                "GET /repos/{owner}/{repo}/actions/permissions",
                {},
                { renamed: ["actions", "getGithubActionsPermissionsRepository"] },
            ],
            getRepoPublicKey: ["GET /repos/{owner}/{repo}/actions/secrets/public-key"],
            getRepoSecret: ["GET /repos/{owner}/{repo}/actions/secrets/{secret_name}"],
            getReviewsForRun: [
                "GET /repos/{owner}/{repo}/actions/runs/{run_id}/approvals",
            ],
            getSelfHostedRunnerForOrg: ["GET /orgs/{org}/actions/runners/{runner_id}"],
            getSelfHostedRunnerForRepo: [
                "GET /repos/{owner}/{repo}/actions/runners/{runner_id}",
            ],
            getWorkflow: ["GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}"],
            getWorkflowRun: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}"],
            getWorkflowRunUsage: [
                "GET /repos/{owner}/{repo}/actions/runs/{run_id}/timing",
            ],
            getWorkflowUsage: [
                "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/timing",
            ],
            listArtifactsForRepo: ["GET /repos/{owner}/{repo}/actions/artifacts"],
            listEnvironmentSecrets: [
                "GET /repositories/{repository_id}/environments/{environment_name}/secrets",
            ],
            listJobsForWorkflowRun: [
                "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
            ],
            listOrgSecrets: ["GET /orgs/{org}/actions/secrets"],
            listRepoSecrets: ["GET /repos/{owner}/{repo}/actions/secrets"],
            listRepoWorkflows: ["GET /repos/{owner}/{repo}/actions/workflows"],
            listRunnerApplicationsForOrg: ["GET /orgs/{org}/actions/runners/downloads"],
            listRunnerApplicationsForRepo: [
                "GET /repos/{owner}/{repo}/actions/runners/downloads",
            ],
            listSelectedReposForOrgSecret: [
                "GET /orgs/{org}/actions/secrets/{secret_name}/repositories",
            ],
            listSelectedRepositoriesEnabledGithubActionsOrganization: [
                "GET /orgs/{org}/actions/permissions/repositories",
            ],
            listSelfHostedRunnersForOrg: ["GET /orgs/{org}/actions/runners"],
            listSelfHostedRunnersForRepo: ["GET /repos/{owner}/{repo}/actions/runners"],
            listWorkflowRunArtifacts: [
                "GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts",
            ],
            listWorkflowRuns: [
                "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs",
            ],
            listWorkflowRunsForRepo: ["GET /repos/{owner}/{repo}/actions/runs"],
            reRunWorkflow: ["POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun"],
            removeSelectedRepoFromOrgSecret: [
                "DELETE /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}",
            ],
            reviewPendingDeploymentsForRun: [
                "POST /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments",
            ],
            setAllowedActionsOrganization: [
                "PUT /orgs/{org}/actions/permissions/selected-actions",
            ],
            setAllowedActionsRepository: [
                "PUT /repos/{owner}/{repo}/actions/permissions/selected-actions",
            ],
            setGithubActionsPermissionsOrganization: [
                "PUT /orgs/{org}/actions/permissions",
            ],
            setGithubActionsPermissionsRepository: [
                "PUT /repos/{owner}/{repo}/actions/permissions",
            ],
            setSelectedReposForOrgSecret: [
                "PUT /orgs/{org}/actions/secrets/{secret_name}/repositories",
            ],
            setSelectedRepositoriesEnabledGithubActionsOrganization: [
                "PUT /orgs/{org}/actions/permissions/repositories",
            ],
        },
        activity: {
            checkRepoIsStarredByAuthenticatedUser: ["GET /user/starred/{owner}/{repo}"],
            deleteRepoSubscription: ["DELETE /repos/{owner}/{repo}/subscription"],
            deleteThreadSubscription: [
                "DELETE /notifications/threads/{thread_id}/subscription",
            ],
            getFeeds: ["GET /feeds"],
            getRepoSubscription: ["GET /repos/{owner}/{repo}/subscription"],
            getThread: ["GET /notifications/threads/{thread_id}"],
            getThreadSubscriptionForAuthenticatedUser: [
                "GET /notifications/threads/{thread_id}/subscription",
            ],
            listEventsForAuthenticatedUser: ["GET /users/{username}/events"],
            listNotificationsForAuthenticatedUser: ["GET /notifications"],
            listOrgEventsForAuthenticatedUser: [
                "GET /users/{username}/events/orgs/{org}",
            ],
            listPublicEvents: ["GET /events"],
            listPublicEventsForRepoNetwork: ["GET /networks/{owner}/{repo}/events"],
            listPublicEventsForUser: ["GET /users/{username}/events/public"],
            listPublicOrgEvents: ["GET /orgs/{org}/events"],
            listReceivedEventsForUser: ["GET /users/{username}/received_events"],
            listReceivedPublicEventsForUser: [
                "GET /users/{username}/received_events/public",
            ],
            listRepoEvents: ["GET /repos/{owner}/{repo}/events"],
            listRepoNotificationsForAuthenticatedUser: [
                "GET /repos/{owner}/{repo}/notifications",
            ],
            listReposStarredByAuthenticatedUser: ["GET /user/starred"],
            listReposStarredByUser: ["GET /users/{username}/starred"],
            listReposWatchedByUser: ["GET /users/{username}/subscriptions"],
            listStargazersForRepo: ["GET /repos/{owner}/{repo}/stargazers"],
            listWatchedReposForAuthenticatedUser: ["GET /user/subscriptions"],
            listWatchersForRepo: ["GET /repos/{owner}/{repo}/subscribers"],
            markNotificationsAsRead: ["PUT /notifications"],
            markRepoNotificationsAsRead: ["PUT /repos/{owner}/{repo}/notifications"],
            markThreadAsRead: ["PATCH /notifications/threads/{thread_id}"],
            setRepoSubscription: ["PUT /repos/{owner}/{repo}/subscription"],
            setThreadSubscription: [
                "PUT /notifications/threads/{thread_id}/subscription",
            ],
            starRepoForAuthenticatedUser: ["PUT /user/starred/{owner}/{repo}"],
            unstarRepoForAuthenticatedUser: ["DELETE /user/starred/{owner}/{repo}"],
        },
        apps: {
            addRepoToInstallation: [
                "PUT /user/installations/{installation_id}/repositories/{repository_id}",
            ],
            checkToken: ["POST /applications/{client_id}/token"],
            createContentAttachment: [
                "POST /content_references/{content_reference_id}/attachments",
                { mediaType: { previews: ["corsair"] } },
            ],
            createFromManifest: ["POST /app-manifests/{code}/conversions"],
            createInstallationAccessToken: [
                "POST /app/installations/{installation_id}/access_tokens",
            ],
            deleteAuthorization: ["DELETE /applications/{client_id}/grant"],
            deleteInstallation: ["DELETE /app/installations/{installation_id}"],
            deleteToken: ["DELETE /applications/{client_id}/token"],
            getAuthenticated: ["GET /app"],
            getBySlug: ["GET /apps/{app_slug}"],
            getInstallation: ["GET /app/installations/{installation_id}"],
            getOrgInstallation: ["GET /orgs/{org}/installation"],
            getRepoInstallation: ["GET /repos/{owner}/{repo}/installation"],
            getSubscriptionPlanForAccount: [
                "GET /marketplace_listing/accounts/{account_id}",
            ],
            getSubscriptionPlanForAccountStubbed: [
                "GET /marketplace_listing/stubbed/accounts/{account_id}",
            ],
            getUserInstallation: ["GET /users/{username}/installation"],
            getWebhookConfigForApp: ["GET /app/hook/config"],
            listAccountsForPlan: ["GET /marketplace_listing/plans/{plan_id}/accounts"],
            listAccountsForPlanStubbed: [
                "GET /marketplace_listing/stubbed/plans/{plan_id}/accounts",
            ],
            listInstallationReposForAuthenticatedUser: [
                "GET /user/installations/{installation_id}/repositories",
            ],
            listInstallations: ["GET /app/installations"],
            listInstallationsForAuthenticatedUser: ["GET /user/installations"],
            listPlans: ["GET /marketplace_listing/plans"],
            listPlansStubbed: ["GET /marketplace_listing/stubbed/plans"],
            listReposAccessibleToInstallation: ["GET /installation/repositories"],
            listSubscriptionsForAuthenticatedUser: ["GET /user/marketplace_purchases"],
            listSubscriptionsForAuthenticatedUserStubbed: [
                "GET /user/marketplace_purchases/stubbed",
            ],
            removeRepoFromInstallation: [
                "DELETE /user/installations/{installation_id}/repositories/{repository_id}",
            ],
            resetToken: ["PATCH /applications/{client_id}/token"],
            revokeInstallationAccessToken: ["DELETE /installation/token"],
            scopeToken: ["POST /applications/{client_id}/token/scoped"],
            suspendInstallation: ["PUT /app/installations/{installation_id}/suspended"],
            unsuspendInstallation: [
                "DELETE /app/installations/{installation_id}/suspended",
            ],
            updateWebhookConfigForApp: ["PATCH /app/hook/config"],
        },
        billing: {
            getGithubActionsBillingOrg: ["GET /orgs/{org}/settings/billing/actions"],
            getGithubActionsBillingUser: [
                "GET /users/{username}/settings/billing/actions",
            ],
            getGithubPackagesBillingOrg: ["GET /orgs/{org}/settings/billing/packages"],
            getGithubPackagesBillingUser: [
                "GET /users/{username}/settings/billing/packages",
            ],
            getSharedStorageBillingOrg: [
                "GET /orgs/{org}/settings/billing/shared-storage",
            ],
            getSharedStorageBillingUser: [
                "GET /users/{username}/settings/billing/shared-storage",
            ],
        },
        checks: {
            create: ["POST /repos/{owner}/{repo}/check-runs"],
            createSuite: ["POST /repos/{owner}/{repo}/check-suites"],
            get: ["GET /repos/{owner}/{repo}/check-runs/{check_run_id}"],
            getSuite: ["GET /repos/{owner}/{repo}/check-suites/{check_suite_id}"],
            listAnnotations: [
                "GET /repos/{owner}/{repo}/check-runs/{check_run_id}/annotations",
            ],
            listForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-runs"],
            listForSuite: [
                "GET /repos/{owner}/{repo}/check-suites/{check_suite_id}/check-runs",
            ],
            listSuitesForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-suites"],
            rerequestSuite: [
                "POST /repos/{owner}/{repo}/check-suites/{check_suite_id}/rerequest",
            ],
            setSuitesPreferences: [
                "PATCH /repos/{owner}/{repo}/check-suites/preferences",
            ],
            update: ["PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}"],
        },
        codeScanning: {
            deleteAnalysis: [
                "DELETE /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}{?confirm_delete}",
            ],
            getAlert: [
                "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}",
                {},
                { renamedParameters: { alert_id: "alert_number" } },
            ],
            getAnalysis: [
                "GET /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}",
            ],
            getSarif: ["GET /repos/{owner}/{repo}/code-scanning/sarifs/{sarif_id}"],
            listAlertsForRepo: ["GET /repos/{owner}/{repo}/code-scanning/alerts"],
            listAlertsInstances: [
                "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances",
            ],
            listRecentAnalyses: ["GET /repos/{owner}/{repo}/code-scanning/analyses"],
            updateAlert: [
                "PATCH /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}",
            ],
            uploadSarif: ["POST /repos/{owner}/{repo}/code-scanning/sarifs"],
        },
        codesOfConduct: {
            getAllCodesOfConduct: [
                "GET /codes_of_conduct",
                { mediaType: { previews: ["scarlet-witch"] } },
            ],
            getConductCode: [
                "GET /codes_of_conduct/{key}",
                { mediaType: { previews: ["scarlet-witch"] } },
            ],
            getForRepo: [
                "GET /repos/{owner}/{repo}/community/code_of_conduct",
                { mediaType: { previews: ["scarlet-witch"] } },
            ],
        },
        emojis: { get: ["GET /emojis"] },
        enterpriseAdmin: {
            disableSelectedOrganizationGithubActionsEnterprise: [
                "DELETE /enterprises/{enterprise}/actions/permissions/organizations/{org_id}",
            ],
            enableSelectedOrganizationGithubActionsEnterprise: [
                "PUT /enterprises/{enterprise}/actions/permissions/organizations/{org_id}",
            ],
            getAllowedActionsEnterprise: [
                "GET /enterprises/{enterprise}/actions/permissions/selected-actions",
            ],
            getGithubActionsPermissionsEnterprise: [
                "GET /enterprises/{enterprise}/actions/permissions",
            ],
            listSelectedOrganizationsEnabledGithubActionsEnterprise: [
                "GET /enterprises/{enterprise}/actions/permissions/organizations",
            ],
            setAllowedActionsEnterprise: [
                "PUT /enterprises/{enterprise}/actions/permissions/selected-actions",
            ],
            setGithubActionsPermissionsEnterprise: [
                "PUT /enterprises/{enterprise}/actions/permissions",
            ],
            setSelectedOrganizationsEnabledGithubActionsEnterprise: [
                "PUT /enterprises/{enterprise}/actions/permissions/organizations",
            ],
        },
        gists: {
            checkIsStarred: ["GET /gists/{gist_id}/star"],
            create: ["POST /gists"],
            createComment: ["POST /gists/{gist_id}/comments"],
            delete: ["DELETE /gists/{gist_id}"],
            deleteComment: ["DELETE /gists/{gist_id}/comments/{comment_id}"],
            fork: ["POST /gists/{gist_id}/forks"],
            get: ["GET /gists/{gist_id}"],
            getComment: ["GET /gists/{gist_id}/comments/{comment_id}"],
            getRevision: ["GET /gists/{gist_id}/{sha}"],
            list: ["GET /gists"],
            listComments: ["GET /gists/{gist_id}/comments"],
            listCommits: ["GET /gists/{gist_id}/commits"],
            listForUser: ["GET /users/{username}/gists"],
            listForks: ["GET /gists/{gist_id}/forks"],
            listPublic: ["GET /gists/public"],
            listStarred: ["GET /gists/starred"],
            star: ["PUT /gists/{gist_id}/star"],
            unstar: ["DELETE /gists/{gist_id}/star"],
            update: ["PATCH /gists/{gist_id}"],
            updateComment: ["PATCH /gists/{gist_id}/comments/{comment_id}"],
        },
        git: {
            createBlob: ["POST /repos/{owner}/{repo}/git/blobs"],
            createCommit: ["POST /repos/{owner}/{repo}/git/commits"],
            createRef: ["POST /repos/{owner}/{repo}/git/refs"],
            createTag: ["POST /repos/{owner}/{repo}/git/tags"],
            createTree: ["POST /repos/{owner}/{repo}/git/trees"],
            deleteRef: ["DELETE /repos/{owner}/{repo}/git/refs/{ref}"],
            getBlob: ["GET /repos/{owner}/{repo}/git/blobs/{file_sha}"],
            getCommit: ["GET /repos/{owner}/{repo}/git/commits/{commit_sha}"],
            getRef: ["GET /repos/{owner}/{repo}/git/ref/{ref}"],
            getTag: ["GET /repos/{owner}/{repo}/git/tags/{tag_sha}"],
            getTree: ["GET /repos/{owner}/{repo}/git/trees/{tree_sha}"],
            listMatchingRefs: ["GET /repos/{owner}/{repo}/git/matching-refs/{ref}"],
            updateRef: ["PATCH /repos/{owner}/{repo}/git/refs/{ref}"],
        },
        gitignore: {
            getAllTemplates: ["GET /gitignore/templates"],
            getTemplate: ["GET /gitignore/templates/{name}"],
        },
        interactions: {
            getRestrictionsForAuthenticatedUser: ["GET /user/interaction-limits"],
            getRestrictionsForOrg: ["GET /orgs/{org}/interaction-limits"],
            getRestrictionsForRepo: ["GET /repos/{owner}/{repo}/interaction-limits"],
            getRestrictionsForYourPublicRepos: [
                "GET /user/interaction-limits",
                {},
                { renamed: ["interactions", "getRestrictionsForAuthenticatedUser"] },
            ],
            removeRestrictionsForAuthenticatedUser: ["DELETE /user/interaction-limits"],
            removeRestrictionsForOrg: ["DELETE /orgs/{org}/interaction-limits"],
            removeRestrictionsForRepo: [
                "DELETE /repos/{owner}/{repo}/interaction-limits",
            ],
            removeRestrictionsForYourPublicRepos: [
                "DELETE /user/interaction-limits",
                {},
                { renamed: ["interactions", "removeRestrictionsForAuthenticatedUser"] },
            ],
            setRestrictionsForAuthenticatedUser: ["PUT /user/interaction-limits"],
            setRestrictionsForOrg: ["PUT /orgs/{org}/interaction-limits"],
            setRestrictionsForRepo: ["PUT /repos/{owner}/{repo}/interaction-limits"],
            setRestrictionsForYourPublicRepos: [
                "PUT /user/interaction-limits",
                {},
                { renamed: ["interactions", "setRestrictionsForAuthenticatedUser"] },
            ],
        },
        issues: {
            addAssignees: [
                "POST /repos/{owner}/{repo}/issues/{issue_number}/assignees",
            ],
            addLabels: ["POST /repos/{owner}/{repo}/issues/{issue_number}/labels"],
            checkUserCanBeAssigned: ["GET /repos/{owner}/{repo}/assignees/{assignee}"],
            create: ["POST /repos/{owner}/{repo}/issues"],
            createComment: [
                "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
            ],
            createLabel: ["POST /repos/{owner}/{repo}/labels"],
            createMilestone: ["POST /repos/{owner}/{repo}/milestones"],
            deleteComment: [
                "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}",
            ],
            deleteLabel: ["DELETE /repos/{owner}/{repo}/labels/{name}"],
            deleteMilestone: [
                "DELETE /repos/{owner}/{repo}/milestones/{milestone_number}",
            ],
            get: ["GET /repos/{owner}/{repo}/issues/{issue_number}"],
            getComment: ["GET /repos/{owner}/{repo}/issues/comments/{comment_id}"],
            getEvent: ["GET /repos/{owner}/{repo}/issues/events/{event_id}"],
            getLabel: ["GET /repos/{owner}/{repo}/labels/{name}"],
            getMilestone: ["GET /repos/{owner}/{repo}/milestones/{milestone_number}"],
            list: ["GET /issues"],
            listAssignees: ["GET /repos/{owner}/{repo}/assignees"],
            listComments: ["GET /repos/{owner}/{repo}/issues/{issue_number}/comments"],
            listCommentsForRepo: ["GET /repos/{owner}/{repo}/issues/comments"],
            listEvents: ["GET /repos/{owner}/{repo}/issues/{issue_number}/events"],
            listEventsForRepo: ["GET /repos/{owner}/{repo}/issues/events"],
            listEventsForTimeline: [
                "GET /repos/{owner}/{repo}/issues/{issue_number}/timeline",
                { mediaType: { previews: ["mockingbird"] } },
            ],
            listForAuthenticatedUser: ["GET /user/issues"],
            listForOrg: ["GET /orgs/{org}/issues"],
            listForRepo: ["GET /repos/{owner}/{repo}/issues"],
            listLabelsForMilestone: [
                "GET /repos/{owner}/{repo}/milestones/{milestone_number}/labels",
            ],
            listLabelsForRepo: ["GET /repos/{owner}/{repo}/labels"],
            listLabelsOnIssue: [
                "GET /repos/{owner}/{repo}/issues/{issue_number}/labels",
            ],
            listMilestones: ["GET /repos/{owner}/{repo}/milestones"],
            lock: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/lock"],
            removeAllLabels: [
                "DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels",
            ],
            removeAssignees: [
                "DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees",
            ],
            removeLabel: [
                "DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}",
            ],
            setLabels: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/labels"],
            unlock: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/lock"],
            update: ["PATCH /repos/{owner}/{repo}/issues/{issue_number}"],
            updateComment: ["PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}"],
            updateLabel: ["PATCH /repos/{owner}/{repo}/labels/{name}"],
            updateMilestone: [
                "PATCH /repos/{owner}/{repo}/milestones/{milestone_number}",
            ],
        },
        licenses: {
            get: ["GET /licenses/{license}"],
            getAllCommonlyUsed: ["GET /licenses"],
            getForRepo: ["GET /repos/{owner}/{repo}/license"],
        },
        markdown: {
            render: ["POST /markdown"],
            renderRaw: [
                "POST /markdown/raw",
                { headers: { "content-type": "text/plain; charset=utf-8" } },
            ],
        },
        meta: {
            get: ["GET /meta"],
            getOctocat: ["GET /octocat"],
            getZen: ["GET /zen"],
            root: ["GET /"],
        },
        migrations: {
            cancelImport: ["DELETE /repos/{owner}/{repo}/import"],
            deleteArchiveForAuthenticatedUser: [
                "DELETE /user/migrations/{migration_id}/archive",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            deleteArchiveForOrg: [
                "DELETE /orgs/{org}/migrations/{migration_id}/archive",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            downloadArchiveForOrg: [
                "GET /orgs/{org}/migrations/{migration_id}/archive",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            getArchiveForAuthenticatedUser: [
                "GET /user/migrations/{migration_id}/archive",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            getCommitAuthors: ["GET /repos/{owner}/{repo}/import/authors"],
            getImportStatus: ["GET /repos/{owner}/{repo}/import"],
            getLargeFiles: ["GET /repos/{owner}/{repo}/import/large_files"],
            getStatusForAuthenticatedUser: [
                "GET /user/migrations/{migration_id}",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            getStatusForOrg: [
                "GET /orgs/{org}/migrations/{migration_id}",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            listForAuthenticatedUser: [
                "GET /user/migrations",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            listForOrg: [
                "GET /orgs/{org}/migrations",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            listReposForOrg: [
                "GET /orgs/{org}/migrations/{migration_id}/repositories",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            listReposForUser: [
                "GET /user/migrations/{migration_id}/repositories",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            mapCommitAuthor: ["PATCH /repos/{owner}/{repo}/import/authors/{author_id}"],
            setLfsPreference: ["PATCH /repos/{owner}/{repo}/import/lfs"],
            startForAuthenticatedUser: ["POST /user/migrations"],
            startForOrg: ["POST /orgs/{org}/migrations"],
            startImport: ["PUT /repos/{owner}/{repo}/import"],
            unlockRepoForAuthenticatedUser: [
                "DELETE /user/migrations/{migration_id}/repos/{repo_name}/lock",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            unlockRepoForOrg: [
                "DELETE /orgs/{org}/migrations/{migration_id}/repos/{repo_name}/lock",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            updateImport: ["PATCH /repos/{owner}/{repo}/import"],
        },
        orgs: {
            blockUser: ["PUT /orgs/{org}/blocks/{username}"],
            cancelInvitation: ["DELETE /orgs/{org}/invitations/{invitation_id}"],
            checkBlockedUser: ["GET /orgs/{org}/blocks/{username}"],
            checkMembershipForUser: ["GET /orgs/{org}/members/{username}"],
            checkPublicMembershipForUser: ["GET /orgs/{org}/public_members/{username}"],
            convertMemberToOutsideCollaborator: [
                "PUT /orgs/{org}/outside_collaborators/{username}",
            ],
            createInvitation: ["POST /orgs/{org}/invitations"],
            createWebhook: ["POST /orgs/{org}/hooks"],
            deleteWebhook: ["DELETE /orgs/{org}/hooks/{hook_id}"],
            get: ["GET /orgs/{org}"],
            getMembershipForAuthenticatedUser: ["GET /user/memberships/orgs/{org}"],
            getMembershipForUser: ["GET /orgs/{org}/memberships/{username}"],
            getWebhook: ["GET /orgs/{org}/hooks/{hook_id}"],
            getWebhookConfigForOrg: ["GET /orgs/{org}/hooks/{hook_id}/config"],
            list: ["GET /organizations"],
            listAppInstallations: ["GET /orgs/{org}/installations"],
            listBlockedUsers: ["GET /orgs/{org}/blocks"],
            listFailedInvitations: ["GET /orgs/{org}/failed_invitations"],
            listForAuthenticatedUser: ["GET /user/orgs"],
            listForUser: ["GET /users/{username}/orgs"],
            listInvitationTeams: ["GET /orgs/{org}/invitations/{invitation_id}/teams"],
            listMembers: ["GET /orgs/{org}/members"],
            listMembershipsForAuthenticatedUser: ["GET /user/memberships/orgs"],
            listOutsideCollaborators: ["GET /orgs/{org}/outside_collaborators"],
            listPendingInvitations: ["GET /orgs/{org}/invitations"],
            listPublicMembers: ["GET /orgs/{org}/public_members"],
            listWebhooks: ["GET /orgs/{org}/hooks"],
            pingWebhook: ["POST /orgs/{org}/hooks/{hook_id}/pings"],
            removeMember: ["DELETE /orgs/{org}/members/{username}"],
            removeMembershipForUser: ["DELETE /orgs/{org}/memberships/{username}"],
            removeOutsideCollaborator: [
                "DELETE /orgs/{org}/outside_collaborators/{username}",
            ],
            removePublicMembershipForAuthenticatedUser: [
                "DELETE /orgs/{org}/public_members/{username}",
            ],
            setMembershipForUser: ["PUT /orgs/{org}/memberships/{username}"],
            setPublicMembershipForAuthenticatedUser: [
                "PUT /orgs/{org}/public_members/{username}",
            ],
            unblockUser: ["DELETE /orgs/{org}/blocks/{username}"],
            update: ["PATCH /orgs/{org}"],
            updateMembershipForAuthenticatedUser: [
                "PATCH /user/memberships/orgs/{org}",
            ],
            updateWebhook: ["PATCH /orgs/{org}/hooks/{hook_id}"],
            updateWebhookConfigForOrg: ["PATCH /orgs/{org}/hooks/{hook_id}/config"],
        },
        packages: {
            deletePackageForAuthenticatedUser: [
                "DELETE /user/packages/{package_type}/{package_name}",
            ],
            deletePackageForOrg: [
                "DELETE /orgs/{org}/packages/{package_type}/{package_name}",
            ],
            deletePackageVersionForAuthenticatedUser: [
                "DELETE /user/packages/{package_type}/{package_name}/versions/{package_version_id}",
            ],
            deletePackageVersionForOrg: [
                "DELETE /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}",
            ],
            getAllPackageVersionsForAPackageOwnedByAnOrg: [
                "GET /orgs/{org}/packages/{package_type}/{package_name}/versions",
                {},
                { renamed: ["packages", "getAllPackageVersionsForPackageOwnedByOrg"] },
            ],
            getAllPackageVersionsForAPackageOwnedByTheAuthenticatedUser: [
                "GET /user/packages/{package_type}/{package_name}/versions",
                {},
                {
                    renamed: [
                        "packages",
                        "getAllPackageVersionsForPackageOwnedByAuthenticatedUser",
                    ],
                },
            ],
            getAllPackageVersionsForPackageOwnedByAuthenticatedUser: [
                "GET /user/packages/{package_type}/{package_name}/versions",
            ],
            getAllPackageVersionsForPackageOwnedByOrg: [
                "GET /orgs/{org}/packages/{package_type}/{package_name}/versions",
            ],
            getAllPackageVersionsForPackageOwnedByUser: [
                "GET /users/{username}/packages/{package_type}/{package_name}/versions",
            ],
            getPackageForAuthenticatedUser: [
                "GET /user/packages/{package_type}/{package_name}",
            ],
            getPackageForOrganization: [
                "GET /orgs/{org}/packages/{package_type}/{package_name}",
            ],
            getPackageForUser: [
                "GET /users/{username}/packages/{package_type}/{package_name}",
            ],
            getPackageVersionForAuthenticatedUser: [
                "GET /user/packages/{package_type}/{package_name}/versions/{package_version_id}",
            ],
            getPackageVersionForOrganization: [
                "GET /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}",
            ],
            getPackageVersionForUser: [
                "GET /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}",
            ],
            restorePackageForAuthenticatedUser: [
                "POST /user/packages/{package_type}/{package_name}/restore{?token}",
            ],
            restorePackageForOrg: [
                "POST /orgs/{org}/packages/{package_type}/{package_name}/restore{?token}",
            ],
            restorePackageVersionForAuthenticatedUser: [
                "POST /user/packages/{package_type}/{package_name}/versions/{package_version_id}/restore",
            ],
            restorePackageVersionForOrg: [
                "POST /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore",
            ],
        },
        projects: {
            addCollaborator: [
                "PUT /projects/{project_id}/collaborators/{username}",
                { mediaType: { previews: ["inertia"] } },
            ],
            createCard: [
                "POST /projects/columns/{column_id}/cards",
                { mediaType: { previews: ["inertia"] } },
            ],
            createColumn: [
                "POST /projects/{project_id}/columns",
                { mediaType: { previews: ["inertia"] } },
            ],
            createForAuthenticatedUser: [
                "POST /user/projects",
                { mediaType: { previews: ["inertia"] } },
            ],
            createForOrg: [
                "POST /orgs/{org}/projects",
                { mediaType: { previews: ["inertia"] } },
            ],
            createForRepo: [
                "POST /repos/{owner}/{repo}/projects",
                { mediaType: { previews: ["inertia"] } },
            ],
            delete: [
                "DELETE /projects/{project_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            deleteCard: [
                "DELETE /projects/columns/cards/{card_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            deleteColumn: [
                "DELETE /projects/columns/{column_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            get: [
                "GET /projects/{project_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            getCard: [
                "GET /projects/columns/cards/{card_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            getColumn: [
                "GET /projects/columns/{column_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            getPermissionForUser: [
                "GET /projects/{project_id}/collaborators/{username}/permission",
                { mediaType: { previews: ["inertia"] } },
            ],
            listCards: [
                "GET /projects/columns/{column_id}/cards",
                { mediaType: { previews: ["inertia"] } },
            ],
            listCollaborators: [
                "GET /projects/{project_id}/collaborators",
                { mediaType: { previews: ["inertia"] } },
            ],
            listColumns: [
                "GET /projects/{project_id}/columns",
                { mediaType: { previews: ["inertia"] } },
            ],
            listForOrg: [
                "GET /orgs/{org}/projects",
                { mediaType: { previews: ["inertia"] } },
            ],
            listForRepo: [
                "GET /repos/{owner}/{repo}/projects",
                { mediaType: { previews: ["inertia"] } },
            ],
            listForUser: [
                "GET /users/{username}/projects",
                { mediaType: { previews: ["inertia"] } },
            ],
            moveCard: [
                "POST /projects/columns/cards/{card_id}/moves",
                { mediaType: { previews: ["inertia"] } },
            ],
            moveColumn: [
                "POST /projects/columns/{column_id}/moves",
                { mediaType: { previews: ["inertia"] } },
            ],
            removeCollaborator: [
                "DELETE /projects/{project_id}/collaborators/{username}",
                { mediaType: { previews: ["inertia"] } },
            ],
            update: [
                "PATCH /projects/{project_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            updateCard: [
                "PATCH /projects/columns/cards/{card_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            updateColumn: [
                "PATCH /projects/columns/{column_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
        },
        pulls: {
            checkIfMerged: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
            create: ["POST /repos/{owner}/{repo}/pulls"],
            createReplyForReviewComment: [
                "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies",
            ],
            createReview: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
            createReviewComment: [
                "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments",
            ],
            deletePendingReview: [
                "DELETE /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}",
            ],
            deleteReviewComment: [
                "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}",
            ],
            dismissReview: [
                "PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/dismissals",
            ],
            get: ["GET /repos/{owner}/{repo}/pulls/{pull_number}"],
            getReview: [
                "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}",
            ],
            getReviewComment: ["GET /repos/{owner}/{repo}/pulls/comments/{comment_id}"],
            list: ["GET /repos/{owner}/{repo}/pulls"],
            listCommentsForReview: [
                "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments",
            ],
            listCommits: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/commits"],
            listFiles: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/files"],
            listRequestedReviewers: [
                "GET /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers",
            ],
            listReviewComments: [
                "GET /repos/{owner}/{repo}/pulls/{pull_number}/comments",
            ],
            listReviewCommentsForRepo: ["GET /repos/{owner}/{repo}/pulls/comments"],
            listReviews: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
            merge: ["PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
            removeRequestedReviewers: [
                "DELETE /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers",
            ],
            requestReviewers: [
                "POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers",
            ],
            submitReview: [
                "POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/events",
            ],
            update: ["PATCH /repos/{owner}/{repo}/pulls/{pull_number}"],
            updateBranch: [
                "PUT /repos/{owner}/{repo}/pulls/{pull_number}/update-branch",
                { mediaType: { previews: ["lydian"] } },
            ],
            updateReview: [
                "PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}",
            ],
            updateReviewComment: [
                "PATCH /repos/{owner}/{repo}/pulls/comments/{comment_id}",
            ],
        },
        rateLimit: { get: ["GET /rate_limit"] },
        reactions: {
            createForCommitComment: [
                "POST /repos/{owner}/{repo}/comments/{comment_id}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            createForIssue: [
                "POST /repos/{owner}/{repo}/issues/{issue_number}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            createForIssueComment: [
                "POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            createForPullRequestReviewComment: [
                "POST /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            createForTeamDiscussionCommentInOrg: [
                "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            createForTeamDiscussionInOrg: [
                "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            deleteForCommitComment: [
                "DELETE /repos/{owner}/{repo}/comments/{comment_id}/reactions/{reaction_id}",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            deleteForIssue: [
                "DELETE /repos/{owner}/{repo}/issues/{issue_number}/reactions/{reaction_id}",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            deleteForIssueComment: [
                "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions/{reaction_id}",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            deleteForPullRequestComment: [
                "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions/{reaction_id}",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            deleteForTeamDiscussion: [
                "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions/{reaction_id}",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            deleteForTeamDiscussionComment: [
                "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions/{reaction_id}",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            deleteLegacy: [
                "DELETE /reactions/{reaction_id}",
                { mediaType: { previews: ["squirrel-girl"] } },
                {
                    deprecated: "octokit.reactions.deleteLegacy() is deprecated, see https://docs.github.com/rest/reference/reactions/#delete-a-reaction-legacy",
                },
            ],
            listForCommitComment: [
                "GET /repos/{owner}/{repo}/comments/{comment_id}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            listForIssue: [
                "GET /repos/{owner}/{repo}/issues/{issue_number}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            listForIssueComment: [
                "GET /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            listForPullRequestReviewComment: [
                "GET /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            listForTeamDiscussionCommentInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            listForTeamDiscussionInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
        },
        repos: {
            acceptInvitation: ["PATCH /user/repository_invitations/{invitation_id}"],
            addAppAccessRestrictions: [
                "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
                {},
                { mapToData: "apps" },
            ],
            addCollaborator: ["PUT /repos/{owner}/{repo}/collaborators/{username}"],
            addStatusCheckContexts: [
                "POST /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
                {},
                { mapToData: "contexts" },
            ],
            addTeamAccessRestrictions: [
                "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
                {},
                { mapToData: "teams" },
            ],
            addUserAccessRestrictions: [
                "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
                {},
                { mapToData: "users" },
            ],
            checkCollaborator: ["GET /repos/{owner}/{repo}/collaborators/{username}"],
            checkVulnerabilityAlerts: [
                "GET /repos/{owner}/{repo}/vulnerability-alerts",
                { mediaType: { previews: ["dorian"] } },
            ],
            compareCommits: ["GET /repos/{owner}/{repo}/compare/{base}...{head}"],
            createCommitComment: [
                "POST /repos/{owner}/{repo}/commits/{commit_sha}/comments",
            ],
            createCommitSignatureProtection: [
                "POST /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures",
                { mediaType: { previews: ["zzzax"] } },
            ],
            createCommitStatus: ["POST /repos/{owner}/{repo}/statuses/{sha}"],
            createDeployKey: ["POST /repos/{owner}/{repo}/keys"],
            createDeployment: ["POST /repos/{owner}/{repo}/deployments"],
            createDeploymentStatus: [
                "POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses",
            ],
            createDispatchEvent: ["POST /repos/{owner}/{repo}/dispatches"],
            createForAuthenticatedUser: ["POST /user/repos"],
            createFork: ["POST /repos/{owner}/{repo}/forks{?org,organization}"],
            createInOrg: ["POST /orgs/{org}/repos"],
            createOrUpdateEnvironment: [
                "PUT /repos/{owner}/{repo}/environments/{environment_name}",
            ],
            createOrUpdateFileContents: ["PUT /repos/{owner}/{repo}/contents/{path}"],
            createPagesSite: [
                "POST /repos/{owner}/{repo}/pages",
                { mediaType: { previews: ["switcheroo"] } },
            ],
            createRelease: ["POST /repos/{owner}/{repo}/releases"],
            createUsingTemplate: [
                "POST /repos/{template_owner}/{template_repo}/generate",
                { mediaType: { previews: ["baptiste"] } },
            ],
            createWebhook: ["POST /repos/{owner}/{repo}/hooks"],
            declineInvitation: ["DELETE /user/repository_invitations/{invitation_id}"],
            delete: ["DELETE /repos/{owner}/{repo}"],
            deleteAccessRestrictions: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions",
            ],
            deleteAdminBranchProtection: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins",
            ],
            deleteAnEnvironment: [
                "DELETE /repos/{owner}/{repo}/environments/{environment_name}",
            ],
            deleteBranchProtection: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection",
            ],
            deleteCommitComment: ["DELETE /repos/{owner}/{repo}/comments/{comment_id}"],
            deleteCommitSignatureProtection: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures",
                { mediaType: { previews: ["zzzax"] } },
            ],
            deleteDeployKey: ["DELETE /repos/{owner}/{repo}/keys/{key_id}"],
            deleteDeployment: [
                "DELETE /repos/{owner}/{repo}/deployments/{deployment_id}",
            ],
            deleteFile: ["DELETE /repos/{owner}/{repo}/contents/{path}"],
            deleteInvitation: [
                "DELETE /repos/{owner}/{repo}/invitations/{invitation_id}",
            ],
            deletePagesSite: [
                "DELETE /repos/{owner}/{repo}/pages",
                { mediaType: { previews: ["switcheroo"] } },
            ],
            deletePullRequestReviewProtection: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews",
            ],
            deleteRelease: ["DELETE /repos/{owner}/{repo}/releases/{release_id}"],
            deleteReleaseAsset: [
                "DELETE /repos/{owner}/{repo}/releases/assets/{asset_id}",
            ],
            deleteWebhook: ["DELETE /repos/{owner}/{repo}/hooks/{hook_id}"],
            disableAutomatedSecurityFixes: [
                "DELETE /repos/{owner}/{repo}/automated-security-fixes",
                { mediaType: { previews: ["london"] } },
            ],
            disableVulnerabilityAlerts: [
                "DELETE /repos/{owner}/{repo}/vulnerability-alerts",
                { mediaType: { previews: ["dorian"] } },
            ],
            downloadArchive: [
                "GET /repos/{owner}/{repo}/zipball/{ref}",
                {},
                { renamed: ["repos", "downloadZipballArchive"] },
            ],
            downloadTarballArchive: ["GET /repos/{owner}/{repo}/tarball/{ref}"],
            downloadZipballArchive: ["GET /repos/{owner}/{repo}/zipball/{ref}"],
            enableAutomatedSecurityFixes: [
                "PUT /repos/{owner}/{repo}/automated-security-fixes",
                { mediaType: { previews: ["london"] } },
            ],
            enableVulnerabilityAlerts: [
                "PUT /repos/{owner}/{repo}/vulnerability-alerts",
                { mediaType: { previews: ["dorian"] } },
            ],
            get: ["GET /repos/{owner}/{repo}"],
            getAccessRestrictions: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions",
            ],
            getAdminBranchProtection: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins",
            ],
            getAllEnvironments: ["GET /repos/{owner}/{repo}/environments"],
            getAllStatusCheckContexts: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
            ],
            getAllTopics: [
                "GET /repos/{owner}/{repo}/topics",
                { mediaType: { previews: ["mercy"] } },
            ],
            getAppsWithAccessToProtectedBranch: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
            ],
            getBranch: ["GET /repos/{owner}/{repo}/branches/{branch}"],
            getBranchProtection: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection",
            ],
            getClones: ["GET /repos/{owner}/{repo}/traffic/clones"],
            getCodeFrequencyStats: ["GET /repos/{owner}/{repo}/stats/code_frequency"],
            getCollaboratorPermissionLevel: [
                "GET /repos/{owner}/{repo}/collaborators/{username}/permission",
            ],
            getCombinedStatusForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/status"],
            getCommit: ["GET /repos/{owner}/{repo}/commits/{ref}"],
            getCommitActivityStats: ["GET /repos/{owner}/{repo}/stats/commit_activity"],
            getCommitComment: ["GET /repos/{owner}/{repo}/comments/{comment_id}"],
            getCommitSignatureProtection: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures",
                { mediaType: { previews: ["zzzax"] } },
            ],
            getCommunityProfileMetrics: ["GET /repos/{owner}/{repo}/community/profile"],
            getContent: ["GET /repos/{owner}/{repo}/contents/{path}"],
            getContributorsStats: ["GET /repos/{owner}/{repo}/stats/contributors"],
            getDeployKey: ["GET /repos/{owner}/{repo}/keys/{key_id}"],
            getDeployment: ["GET /repos/{owner}/{repo}/deployments/{deployment_id}"],
            getDeploymentStatus: [
                "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses/{status_id}",
            ],
            getEnvironment: [
                "GET /repos/{owner}/{repo}/environments/{environment_name}",
            ],
            getLatestPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/latest"],
            getLatestRelease: ["GET /repos/{owner}/{repo}/releases/latest"],
            getPages: ["GET /repos/{owner}/{repo}/pages"],
            getPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/{build_id}"],
            getParticipationStats: ["GET /repos/{owner}/{repo}/stats/participation"],
            getPullRequestReviewProtection: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews",
            ],
            getPunchCardStats: ["GET /repos/{owner}/{repo}/stats/punch_card"],
            getReadme: ["GET /repos/{owner}/{repo}/readme"],
            getReadmeInDirectory: ["GET /repos/{owner}/{repo}/readme/{dir}"],
            getRelease: ["GET /repos/{owner}/{repo}/releases/{release_id}"],
            getReleaseAsset: ["GET /repos/{owner}/{repo}/releases/assets/{asset_id}"],
            getReleaseByTag: ["GET /repos/{owner}/{repo}/releases/tags/{tag}"],
            getStatusChecksProtection: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks",
            ],
            getTeamsWithAccessToProtectedBranch: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
            ],
            getTopPaths: ["GET /repos/{owner}/{repo}/traffic/popular/paths"],
            getTopReferrers: ["GET /repos/{owner}/{repo}/traffic/popular/referrers"],
            getUsersWithAccessToProtectedBranch: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
            ],
            getViews: ["GET /repos/{owner}/{repo}/traffic/views"],
            getWebhook: ["GET /repos/{owner}/{repo}/hooks/{hook_id}"],
            getWebhookConfigForRepo: [
                "GET /repos/{owner}/{repo}/hooks/{hook_id}/config",
            ],
            listBranches: ["GET /repos/{owner}/{repo}/branches"],
            listBranchesForHeadCommit: [
                "GET /repos/{owner}/{repo}/commits/{commit_sha}/branches-where-head",
                { mediaType: { previews: ["groot"] } },
            ],
            listCollaborators: ["GET /repos/{owner}/{repo}/collaborators"],
            listCommentsForCommit: [
                "GET /repos/{owner}/{repo}/commits/{commit_sha}/comments",
            ],
            listCommitCommentsForRepo: ["GET /repos/{owner}/{repo}/comments"],
            listCommitStatusesForRef: [
                "GET /repos/{owner}/{repo}/commits/{ref}/statuses",
            ],
            listCommits: ["GET /repos/{owner}/{repo}/commits"],
            listContributors: ["GET /repos/{owner}/{repo}/contributors"],
            listDeployKeys: ["GET /repos/{owner}/{repo}/keys"],
            listDeploymentStatuses: [
                "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses",
            ],
            listDeployments: ["GET /repos/{owner}/{repo}/deployments"],
            listForAuthenticatedUser: ["GET /user/repos"],
            listForOrg: ["GET /orgs/{org}/repos"],
            listForUser: ["GET /users/{username}/repos"],
            listForks: ["GET /repos/{owner}/{repo}/forks"],
            listInvitations: ["GET /repos/{owner}/{repo}/invitations"],
            listInvitationsForAuthenticatedUser: ["GET /user/repository_invitations"],
            listLanguages: ["GET /repos/{owner}/{repo}/languages"],
            listPagesBuilds: ["GET /repos/{owner}/{repo}/pages/builds"],
            listPublic: ["GET /repositories"],
            listPullRequestsAssociatedWithCommit: [
                "GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls",
                { mediaType: { previews: ["groot"] } },
            ],
            listReleaseAssets: [
                "GET /repos/{owner}/{repo}/releases/{release_id}/assets",
            ],
            listReleases: ["GET /repos/{owner}/{repo}/releases"],
            listTags: ["GET /repos/{owner}/{repo}/tags"],
            listTeams: ["GET /repos/{owner}/{repo}/teams"],
            listWebhooks: ["GET /repos/{owner}/{repo}/hooks"],
            merge: ["POST /repos/{owner}/{repo}/merges"],
            pingWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/pings"],
            removeAppAccessRestrictions: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
                {},
                { mapToData: "apps" },
            ],
            removeCollaborator: [
                "DELETE /repos/{owner}/{repo}/collaborators/{username}",
            ],
            removeStatusCheckContexts: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
                {},
                { mapToData: "contexts" },
            ],
            removeStatusCheckProtection: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks",
            ],
            removeTeamAccessRestrictions: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
                {},
                { mapToData: "teams" },
            ],
            removeUserAccessRestrictions: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
                {},
                { mapToData: "users" },
            ],
            renameBranch: ["POST /repos/{owner}/{repo}/branches/{branch}/rename"],
            replaceAllTopics: [
                "PUT /repos/{owner}/{repo}/topics",
                { mediaType: { previews: ["mercy"] } },
            ],
            requestPagesBuild: ["POST /repos/{owner}/{repo}/pages/builds"],
            setAdminBranchProtection: [
                "POST /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins",
            ],
            setAppAccessRestrictions: [
                "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
                {},
                { mapToData: "apps" },
            ],
            setStatusCheckContexts: [
                "PUT /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
                {},
                { mapToData: "contexts" },
            ],
            setTeamAccessRestrictions: [
                "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
                {},
                { mapToData: "teams" },
            ],
            setUserAccessRestrictions: [
                "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
                {},
                { mapToData: "users" },
            ],
            testPushWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/tests"],
            transfer: ["POST /repos/{owner}/{repo}/transfer"],
            update: ["PATCH /repos/{owner}/{repo}"],
            updateBranchProtection: [
                "PUT /repos/{owner}/{repo}/branches/{branch}/protection",
            ],
            updateCommitComment: ["PATCH /repos/{owner}/{repo}/comments/{comment_id}"],
            updateInformationAboutPagesSite: ["PUT /repos/{owner}/{repo}/pages"],
            updateInvitation: [
                "PATCH /repos/{owner}/{repo}/invitations/{invitation_id}",
            ],
            updatePullRequestReviewProtection: [
                "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews",
            ],
            updateRelease: ["PATCH /repos/{owner}/{repo}/releases/{release_id}"],
            updateReleaseAsset: [
                "PATCH /repos/{owner}/{repo}/releases/assets/{asset_id}",
            ],
            updateStatusCheckPotection: [
                "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks",
                {},
                { renamed: ["repos", "updateStatusCheckProtection"] },
            ],
            updateStatusCheckProtection: [
                "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks",
            ],
            updateWebhook: ["PATCH /repos/{owner}/{repo}/hooks/{hook_id}"],
            updateWebhookConfigForRepo: [
                "PATCH /repos/{owner}/{repo}/hooks/{hook_id}/config",
            ],
            uploadReleaseAsset: [
                "POST /repos/{owner}/{repo}/releases/{release_id}/assets{?name,label}",
                { baseUrl: "https://uploads.github.com" },
            ],
        },
        search: {
            code: ["GET /search/code"],
            commits: ["GET /search/commits", { mediaType: { previews: ["cloak"] } }],
            issuesAndPullRequests: ["GET /search/issues"],
            labels: ["GET /search/labels"],
            repos: ["GET /search/repositories"],
            topics: ["GET /search/topics", { mediaType: { previews: ["mercy"] } }],
            users: ["GET /search/users"],
        },
        secretScanning: {
            getAlert: [
                "GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}",
            ],
            listAlertsForRepo: ["GET /repos/{owner}/{repo}/secret-scanning/alerts"],
            updateAlert: [
                "PATCH /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}",
            ],
        },
        teams: {
            addOrUpdateMembershipForUserInOrg: [
                "PUT /orgs/{org}/teams/{team_slug}/memberships/{username}",
            ],
            addOrUpdateProjectPermissionsInOrg: [
                "PUT /orgs/{org}/teams/{team_slug}/projects/{project_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            addOrUpdateRepoPermissionsInOrg: [
                "PUT /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}",
            ],
            checkPermissionsForProjectInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/projects/{project_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            checkPermissionsForRepoInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}",
            ],
            create: ["POST /orgs/{org}/teams"],
            createDiscussionCommentInOrg: [
                "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments",
            ],
            createDiscussionInOrg: ["POST /orgs/{org}/teams/{team_slug}/discussions"],
            deleteDiscussionCommentInOrg: [
                "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}",
            ],
            deleteDiscussionInOrg: [
                "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}",
            ],
            deleteInOrg: ["DELETE /orgs/{org}/teams/{team_slug}"],
            getByName: ["GET /orgs/{org}/teams/{team_slug}"],
            getDiscussionCommentInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}",
            ],
            getDiscussionInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}",
            ],
            getMembershipForUserInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/memberships/{username}",
            ],
            list: ["GET /orgs/{org}/teams"],
            listChildInOrg: ["GET /orgs/{org}/teams/{team_slug}/teams"],
            listDiscussionCommentsInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments",
            ],
            listDiscussionsInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions"],
            listForAuthenticatedUser: ["GET /user/teams"],
            listMembersInOrg: ["GET /orgs/{org}/teams/{team_slug}/members"],
            listPendingInvitationsInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/invitations",
            ],
            listProjectsInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/projects",
                { mediaType: { previews: ["inertia"] } },
            ],
            listReposInOrg: ["GET /orgs/{org}/teams/{team_slug}/repos"],
            removeMembershipForUserInOrg: [
                "DELETE /orgs/{org}/teams/{team_slug}/memberships/{username}",
            ],
            removeProjectInOrg: [
                "DELETE /orgs/{org}/teams/{team_slug}/projects/{project_id}",
            ],
            removeRepoInOrg: [
                "DELETE /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}",
            ],
            updateDiscussionCommentInOrg: [
                "PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}",
            ],
            updateDiscussionInOrg: [
                "PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}",
            ],
            updateInOrg: ["PATCH /orgs/{org}/teams/{team_slug}"],
        },
        users: {
            addEmailForAuthenticated: ["POST /user/emails"],
            block: ["PUT /user/blocks/{username}"],
            checkBlocked: ["GET /user/blocks/{username}"],
            checkFollowingForUser: ["GET /users/{username}/following/{target_user}"],
            checkPersonIsFollowedByAuthenticated: ["GET /user/following/{username}"],
            createGpgKeyForAuthenticated: ["POST /user/gpg_keys"],
            createPublicSshKeyForAuthenticated: ["POST /user/keys"],
            deleteEmailForAuthenticated: ["DELETE /user/emails"],
            deleteGpgKeyForAuthenticated: ["DELETE /user/gpg_keys/{gpg_key_id}"],
            deletePublicSshKeyForAuthenticated: ["DELETE /user/keys/{key_id}"],
            follow: ["PUT /user/following/{username}"],
            getAuthenticated: ["GET /user"],
            getByUsername: ["GET /users/{username}"],
            getContextForUser: ["GET /users/{username}/hovercard"],
            getGpgKeyForAuthenticated: ["GET /user/gpg_keys/{gpg_key_id}"],
            getPublicSshKeyForAuthenticated: ["GET /user/keys/{key_id}"],
            list: ["GET /users"],
            listBlockedByAuthenticated: ["GET /user/blocks"],
            listEmailsForAuthenticated: ["GET /user/emails"],
            listFollowedByAuthenticated: ["GET /user/following"],
            listFollowersForAuthenticatedUser: ["GET /user/followers"],
            listFollowersForUser: ["GET /users/{username}/followers"],
            listFollowingForUser: ["GET /users/{username}/following"],
            listGpgKeysForAuthenticated: ["GET /user/gpg_keys"],
            listGpgKeysForUser: ["GET /users/{username}/gpg_keys"],
            listPublicEmailsForAuthenticated: ["GET /user/public_emails"],
            listPublicKeysForUser: ["GET /users/{username}/keys"],
            listPublicSshKeysForAuthenticated: ["GET /user/keys"],
            setPrimaryEmailVisibilityForAuthenticated: ["PATCH /user/email/visibility"],
            unblock: ["DELETE /user/blocks/{username}"],
            unfollow: ["DELETE /user/following/{username}"],
            updateAuthenticated: ["PATCH /user"],
        },
    };

    const VERSION$1 = "5.0.0";

    function endpointsToMethods(octokit, endpointsMap) {
        const newMethods = {};
        for (const [scope, endpoints] of Object.entries(endpointsMap)) {
            for (const [methodName, endpoint] of Object.entries(endpoints)) {
                const [route, defaults, decorations] = endpoint;
                const [method, url] = route.split(/ /);
                const endpointDefaults = Object.assign({ method, url }, defaults);
                if (!newMethods[scope]) {
                    newMethods[scope] = {};
                }
                const scopeMethods = newMethods[scope];
                if (decorations) {
                    scopeMethods[methodName] = decorate(octokit, scope, methodName, endpointDefaults, decorations);
                    continue;
                }
                scopeMethods[methodName] = octokit.request.defaults(endpointDefaults);
            }
        }
        return newMethods;
    }
    function decorate(octokit, scope, methodName, defaults, decorations) {
        const requestWithDefaults = octokit.request.defaults(defaults);
        /* istanbul ignore next */
        function withDecorations(...args) {
            // @ts-ignore https://github.com/microsoft/TypeScript/issues/25488
            let options = requestWithDefaults.endpoint.merge(...args);
            // There are currently no other decorations than `.mapToData`
            if (decorations.mapToData) {
                options = Object.assign({}, options, {
                    data: options[decorations.mapToData],
                    [decorations.mapToData]: undefined,
                });
                return requestWithDefaults(options);
            }
            if (decorations.renamed) {
                const [newScope, newMethodName] = decorations.renamed;
                octokit.log.warn(`octokit.${scope}.${methodName}() has been renamed to octokit.${newScope}.${newMethodName}()`);
            }
            if (decorations.deprecated) {
                octokit.log.warn(decorations.deprecated);
            }
            if (decorations.renamedParameters) {
                // @ts-ignore https://github.com/microsoft/TypeScript/issues/25488
                const options = requestWithDefaults.endpoint.merge(...args);
                for (const [name, alias] of Object.entries(decorations.renamedParameters)) {
                    if (name in options) {
                        octokit.log.warn(`"${name}" parameter is deprecated for "octokit.${scope}.${methodName}()". Use "${alias}" instead`);
                        if (!(alias in options)) {
                            options[alias] = options[name];
                        }
                        delete options[name];
                    }
                }
                return requestWithDefaults(options);
            }
            // @ts-ignore https://github.com/microsoft/TypeScript/issues/25488
            return requestWithDefaults(...args);
        }
        return Object.assign(withDecorations, requestWithDefaults);
    }
    function legacyRestEndpointMethods(octokit) {
        const api = endpointsToMethods(octokit, Endpoints);
        return {
            ...api,
            rest: api,
        };
    }
    legacyRestEndpointMethods.VERSION = VERSION$1;

    const VERSION = "18.5.2";

    const Octokit = Octokit$1.plugin(requestLog, legacyRestEndpointMethods, paginateRest).defaults({
        userAgent: `octokit-rest.js/${VERSION}`,
    });

    let ocktokit = new Octokit();

    const getAllRepos = async username => {
        let allItems = [];
        const per_page = 100;
        let page = 1;
        let res;
        while (page > 0) {
            res = await ocktokit.repos.listForUser({
                username: username,
                per_page: per_page,
                page: page,
            });
            if (!res || !res.data || res.data.length)
                page = -1;
            allItems = allItems.concat(res.data);
            page++;
        }
        return { repos: allItems, headers: res.headers };
    };

    const getUser = username => {
        return ocktokit.users.getByUsername({ username: username });
    };

    const getUserStats = async username => {
        const userRes = await getUser(username);
        const user = userRes.data;
        if (!user || !user.public_repos || user.public_repos < 1) {
            return null;
        }
        const { repos, headers } = await getAllRepos(username);
        return { user, repos, headers };
    };

    /* src\components\Profile.svelte generated by Svelte v3.37.0 */

    const file$4 = "src\\components\\Profile.svelte";

    function create_fragment$4(ctx) {
    	let header;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let h1;
    	let t1_value = /*user*/ ctx[0].name + "";
    	let t1;
    	let t2;
    	let p0;
    	let u;
    	let a;
    	let t3_value = /*user*/ ctx[0].login + "";
    	let t3;
    	let a_href_value;
    	let t4;
    	let div2;
    	let p1;
    	let t5_value = /*user*/ ctx[0].bio + "";
    	let t5;
    	let t6;
    	let div1;
    	let svg0;
    	let path0;
    	let t7;
    	let t8_value = /*displayCompany*/ ctx[1]() + "";
    	let t8;
    	let t9;
    	let span0;
    	let t10;
    	let svg1;
    	let path1;
    	let t11;
    	let t12_value = /*displayLocation*/ ctx[2]() + "";
    	let t12;
    	let t13;
    	let span1;
    	let t14;
    	let svg2;
    	let path2;
    	let t15;
    	let t16_value = /*displayCreationDate*/ ctx[3]() + "";
    	let t16;
    	let t17;
    	let div9;
    	let div4;
    	let div3;
    	let span2;
    	let t18_value = /*user*/ ctx[0].public_repos + "";
    	let t18;
    	let t19;
    	let p2;
    	let t21;
    	let div6;
    	let div5;
    	let span3;
    	let t22_value = /*user*/ ctx[0].followers + "";
    	let t22;
    	let t23;
    	let p3;
    	let t25;
    	let div8;
    	let div7;
    	let span4;
    	let t26_value = /*user*/ ctx[0].following + "";
    	let t26;
    	let t27;
    	let p4;

    	const block = {
    		c: function create() {
    			header = element("header");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			h1 = element("h1");
    			t1 = text(t1_value);
    			t2 = space();
    			p0 = element("p");
    			u = element("u");
    			a = element("a");
    			t3 = text(t3_value);
    			t4 = space();
    			div2 = element("div");
    			p1 = element("p");
    			t5 = text(t5_value);
    			t6 = space();
    			div1 = element("div");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t7 = space();
    			t8 = text(t8_value);
    			t9 = space();
    			span0 = element("span");
    			t10 = space();
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			t11 = space();
    			t12 = text(t12_value);
    			t13 = space();
    			span1 = element("span");
    			t14 = space();
    			svg2 = svg_element("svg");
    			path2 = svg_element("path");
    			t15 = space();
    			t16 = text(t16_value);
    			t17 = space();
    			div9 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			span2 = element("span");
    			t18 = text(t18_value);
    			t19 = space();
    			p2 = element("p");
    			p2.textContent = `${("Repositories").toUpperCase()}`;
    			t21 = space();
    			div6 = element("div");
    			div5 = element("div");
    			span3 = element("span");
    			t22 = text(t22_value);
    			t23 = space();
    			p3 = element("p");
    			p3.textContent = `${("Followers").toUpperCase()}`;
    			t25 = space();
    			div8 = element("div");
    			div7 = element("div");
    			span4 = element("span");
    			t26 = text(t26_value);
    			t27 = space();
    			p4 = element("p");
    			p4.textContent = `${("Following").toUpperCase()}`;
    			if (img.src !== (img_src_value = /*user*/ ctx[0].avatar_url)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "avatar");
    			add_location(img, file$4, 26, 4, 678);
    			attr_dev(div0, "class", "avatar svelte-1hx6n2i");
    			add_location(div0, file$4, 25, 2, 652);
    			attr_dev(h1, "class", "title mt-7 has-text-white");
    			add_location(h1, file$4, 28, 2, 734);
    			attr_dev(a, "class", "has-text-white");
    			attr_dev(a, "href", a_href_value = /*user*/ ctx[0].html_url);
    			add_location(a, file$4, 31, 6, 844);
    			add_location(u, file$4, 30, 4, 833);
    			attr_dev(p0, "class", "subtitle has-text-white");
    			add_location(p0, file$4, 29, 2, 792);
    			add_location(p1, file$4, 37, 4, 990);
    			attr_dev(path0, "fill-rule", "evenodd");
    			attr_dev(path0, "d", "M9 4V3c0-.55-.45-1-1-1H6c-.55 0-1 .45-1 1v1H1c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1H9zM6 3h2v1H6V3zm7 6H8v1H6V9H1V5h1v3h10V5h1v4z");
    			add_location(path0, file$4, 47, 9, 1305);
    			attr_dev(svg0, "aria-hidden", "true");
    			attr_dev(svg0, "class", "octicon");
    			attr_dev(svg0, "height", "16");
    			attr_dev(svg0, "role", "img");
    			attr_dev(svg0, "viewBox", "0 0 14 16");
    			attr_dev(svg0, "width", "14");
    			set_style(svg0, "display", "inline-block");
    			set_style(svg0, "fill", "currentcolor");
    			set_style(svg0, "user-select", "none");
    			set_style(svg0, "vertical-align", "text-bottom");
    			add_location(svg0, file$4, 39, 6, 1039);
    			attr_dev(span0, "class", "pl-4");
    			add_location(span0, file$4, 52, 25, 1572);
    			attr_dev(path1, "fill-rule", "evenodd");
    			attr_dev(path1, "d", "M6 0C2.69 0 0 2.5 0 5.5 0 10.02 6 16 6 16s6-5.98 6-10.5C12 2.5 9.31 0 6 0zm0 14.55C4.14 12.52 1 8.44 1 5.5 1 3.02 3.25 1 6 1c1.34 0 2.61.48 3.56 1.36.92.86 1.44 1.97 1.44 3.14 0 2.94-3.14 7.02-5 9.05zM8 5.5c0 1.11-.89 2-2 2-1.11 0-2-.89-2-2 0-1.11.89-2 2-2 1.11 0 2 .89 2 2z");
    			add_location(path1, file$4, 61, 9, 1867);
    			attr_dev(svg1, "aria-hidden", "true");
    			attr_dev(svg1, "class", "octicon");
    			attr_dev(svg1, "height", "16");
    			attr_dev(svg1, "role", "img");
    			attr_dev(svg1, "viewBox", "0 0 12 16");
    			attr_dev(svg1, "width", "12");
    			set_style(svg1, "display", "inline-block");
    			set_style(svg1, "fill", "currentcolor");
    			set_style(svg1, "user-select", "none");
    			set_style(svg1, "vertical-align", "text-bottom");
    			add_location(svg1, file$4, 53, 6, 1601);
    			attr_dev(span1, "class", "pl-4");
    			add_location(span1, file$4, 66, 26, 2247);
    			attr_dev(path2, "fill-rule", "evenodd");
    			attr_dev(path2, "d", "M13 2h-1v1.5c0 .28-.22.5-.5.5h-2c-.28 0-.5-.22-.5-.5V2H6v1.5c0 .28-.22.5-.5.5h-2c-.28 0-.5-.22-.5-.5V2H2c-.55 0-1 .45-1 1v11c0 .55.45 1 1 1h11c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm0 12H2V5h11v9zM5 3H4V1h1v2zm6 0h-1V1h1v2zM6 7H5V6h1v1zm2 0H7V6h1v1zm2 0H9V6h1v1zm2 0h-1V6h1v1zM4 9H3V8h1v1zm2 0H5V8h1v1zm2 0H7V8h1v1zm2 0H9V8h1v1zm2 0h-1V8h1v1zm-8 2H3v-1h1v1zm2 0H5v-1h1v1zm2 0H7v-1h1v1zm2 0H9v-1h1v1zm2 0h-1v-1h1v1zm-8 2H3v-1h1v1zm2 0H5v-1h1v1zm2 0H7v-1h1v1zm2 0H9v-1h1v1z");
    			add_location(path2, file$4, 75, 9, 2542);
    			attr_dev(svg2, "aria-hidden", "true");
    			attr_dev(svg2, "class", "octicon");
    			attr_dev(svg2, "height", "16");
    			attr_dev(svg2, "role", "img");
    			attr_dev(svg2, "viewBox", "0 0 14 16");
    			attr_dev(svg2, "width", "14");
    			set_style(svg2, "display", "inline-block");
    			set_style(svg2, "fill", "currentcolor");
    			set_style(svg2, "user-select", "none");
    			set_style(svg2, "vertical-align", "text-bottom");
    			add_location(svg2, file$4, 67, 6, 2276);
    			attr_dev(div1, "class", "pt-2");
    			add_location(div1, file$4, 38, 4, 1013);
    			attr_dev(div2, "class", "subtitle has-text-white");
    			add_location(div2, file$4, 36, 2, 947);
    			attr_dev(span2, "class", "svelte-1hx6n2i");
    			add_location(span2, file$4, 86, 8, 3236);
    			add_location(p2, file$4, 87, 8, 3278);
    			attr_dev(div3, "class", "card-content svelte-1hx6n2i");
    			add_location(div3, file$4, 85, 6, 3200);
    			attr_dev(div4, "class", "card");
    			add_location(div4, file$4, 84, 4, 3174);
    			attr_dev(span3, "class", "svelte-1hx6n2i");
    			add_location(span3, file$4, 92, 8, 3414);
    			add_location(p3, file$4, 93, 8, 3453);
    			attr_dev(div5, "class", "card-content svelte-1hx6n2i");
    			add_location(div5, file$4, 91, 6, 3378);
    			attr_dev(div6, "class", "card ml-2");
    			add_location(div6, file$4, 90, 4, 3347);
    			attr_dev(span4, "class", "svelte-1hx6n2i");
    			add_location(span4, file$4, 98, 8, 3586);
    			add_location(p4, file$4, 99, 8, 3625);
    			attr_dev(div7, "class", "card-content svelte-1hx6n2i");
    			add_location(div7, file$4, 97, 6, 3550);
    			attr_dev(div8, "class", "card ml-2");
    			add_location(div8, file$4, 96, 4, 3519);
    			attr_dev(div9, "class", "cards pt-4 svelte-1hx6n2i");
    			add_location(div9, file$4, 83, 2, 3144);
    			attr_dev(header, "class", "profile pt-7 svelte-1hx6n2i");
    			add_location(header, file$4, 24, 0, 619);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, div0);
    			append_dev(div0, img);
    			append_dev(header, t0);
    			append_dev(header, h1);
    			append_dev(h1, t1);
    			append_dev(header, t2);
    			append_dev(header, p0);
    			append_dev(p0, u);
    			append_dev(u, a);
    			append_dev(a, t3);
    			append_dev(header, t4);
    			append_dev(header, div2);
    			append_dev(div2, p1);
    			append_dev(p1, t5);
    			append_dev(div2, t6);
    			append_dev(div2, div1);
    			append_dev(div1, svg0);
    			append_dev(svg0, path0);
    			append_dev(div1, t7);
    			append_dev(div1, t8);
    			append_dev(div1, t9);
    			append_dev(div1, span0);
    			append_dev(div1, t10);
    			append_dev(div1, svg1);
    			append_dev(svg1, path1);
    			append_dev(div1, t11);
    			append_dev(div1, t12);
    			append_dev(div1, t13);
    			append_dev(div1, span1);
    			append_dev(div1, t14);
    			append_dev(div1, svg2);
    			append_dev(svg2, path2);
    			append_dev(div1, t15);
    			append_dev(div1, t16);
    			append_dev(header, t17);
    			append_dev(header, div9);
    			append_dev(div9, div4);
    			append_dev(div4, div3);
    			append_dev(div3, span2);
    			append_dev(span2, t18);
    			append_dev(div3, t19);
    			append_dev(div3, p2);
    			append_dev(div9, t21);
    			append_dev(div9, div6);
    			append_dev(div6, div5);
    			append_dev(div5, span3);
    			append_dev(span3, t22);
    			append_dev(div5, t23);
    			append_dev(div5, p3);
    			append_dev(div9, t25);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, span4);
    			append_dev(span4, t26);
    			append_dev(div7, t27);
    			append_dev(div7, p4);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*user*/ 1 && img.src !== (img_src_value = /*user*/ ctx[0].avatar_url)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*user*/ 1 && t1_value !== (t1_value = /*user*/ ctx[0].name + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*user*/ 1 && t3_value !== (t3_value = /*user*/ ctx[0].login + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*user*/ 1 && a_href_value !== (a_href_value = /*user*/ ctx[0].html_url)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*user*/ 1 && t5_value !== (t5_value = /*user*/ ctx[0].bio + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*user*/ 1 && t18_value !== (t18_value = /*user*/ ctx[0].public_repos + "")) set_data_dev(t18, t18_value);
    			if (dirty & /*user*/ 1 && t22_value !== (t22_value = /*user*/ ctx[0].followers + "")) set_data_dev(t22, t22_value);
    			if (dirty & /*user*/ 1 && t26_value !== (t26_value = /*user*/ ctx[0].following + "")) set_data_dev(t26, t26_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Profile", slots, []);
    	let { user } = $$props;

    	const displayCompany = () => {
    		if (user.company == null) return " | " + " No Current Job " + " | "; else return " | " + user.company + " | ";
    	};

    	const displayLocation = () => {
    		if (user.location == null) return ""; else return " | " + user.location + " | ";
    	};

    	const displayCreationDate = () => {
    		let date = new Date(user.created_at).toLocaleDateString("en-US", {
    			month: "long",
    			day: "numeric",
    			year: "numeric"
    		});

    		if (date == null) return ""; else return " | Joined : " + date + " | ";
    	};

    	const writable_props = ["user"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Profile> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("user" in $$props) $$invalidate(0, user = $$props.user);
    	};

    	$$self.$capture_state = () => ({
    		user,
    		displayCompany,
    		displayLocation,
    		displayCreationDate
    	});

    	$$self.$inject_state = $$props => {
    		if ("user" in $$props) $$invalidate(0, user = $$props.user);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [user, displayCompany, displayLocation, displayCreationDate];
    }

    class Profile extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { user: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Profile",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*user*/ ctx[0] === undefined && !("user" in props)) {
    			console.warn("<Profile> was created without expected prop 'user'");
    		}
    	}

    	get user() {
    		throw new Error("<Profile>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set user(value) {
    		throw new Error("<Profile>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var frappeCharts_min_umd = createCommonjsModule(function (module, exports) {
    !function(t,e){module.exports=e();}(commonjsGlobal,function(){function t(t,e){return "string"==typeof t?(e||document).querySelector(t):t||null}function e(t){var e=t.getBoundingClientRect();return {top:e.top+(document.documentElement.scrollTop||document.body.scrollTop),left:e.left+(document.documentElement.scrollLeft||document.body.scrollLeft)}}function i(t){return null===t.offsetParent}function n(t){var e=t.getBoundingClientRect();return e.top>=0&&e.left>=0&&e.bottom<=(window.innerHeight||document.documentElement.clientHeight)&&e.right<=(window.innerWidth||document.documentElement.clientWidth)}function a(t){var e=window.getComputedStyle(t),i=parseFloat(e.paddingLeft)+parseFloat(e.paddingRight);return t.clientWidth-i}function s(t,e,i){var n=document.createEvent("HTMLEvents");n.initEvent(e,!0,!0);for(var a in i)n[a]=i[a];return t.dispatchEvent(n)}function r(t){return t.titleHeight+t.margins.top+t.paddings.top}function o(t){return t.margins.left+t.paddings.left}function l(t){return t.margins.top+t.margins.bottom+t.paddings.top+t.paddings.bottom+t.titleHeight+t.legendHeight}function u(t){return t.margins.left+t.margins.right+t.paddings.left+t.paddings.right}function h(t){return parseFloat(t.toFixed(2))}function c(t,e,i){var n=arguments.length>3&&void 0!==arguments[3]&&arguments[3];i||(i=n?t[0]:t[t.length-1]);var a=new Array(Math.abs(e)).fill(i);return t=n?a.concat(t):t.concat(a)}function d(t,e){return (t+"").length*e}function p(t,e){return {x:Math.sin(t*Zt)*e,y:Math.cos(t*Zt)*e}}function f(t){var e=arguments.length>1&&void 0!==arguments[1]&&arguments[1];return !Number.isNaN(t)&&(void 0!==t&&(!!Number.isFinite(t)&&!(e&&t<0)))}function v(t){return Number(Math.round(t+"e4")+"e-4")}function g(t){var e=void 0,i=void 0,n=void 0;if(t instanceof Date)return new Date(t.getTime());if("object"!==(void 0===t?"undefined":Ht(t))||null===t)return t;e=Array.isArray(t)?[]:{};for(n in t)i=t[n],e[n]=g(i);return e}function m(t,e){var i=void 0,n=void 0;return t<=e?(i=e-t,n=t):(i=t-e,n=e),[i,n]}function y(t,e){var i=arguments.length>2&&void 0!==arguments[2]?arguments[2]:e.length-t.length;return i>0?t=c(t,i):e=c(e,i),[t,e]}function b(t,e){if(t)return t.length>e?t.slice(0,e-3)+"...":t}function x(t){var e=void 0;if("number"==typeof t)e=t;else if("string"==typeof t&&(e=Number(t),Number.isNaN(e)))return t;var i=Math.floor(Math.log10(Math.abs(e)));if(i<=2)return e;var n=Math.floor(i/3),a=Math.pow(10,i-3*n)*+(e/Math.pow(10,i)).toFixed(1);return Math.round(100*a)/100+" "+["","K","M","B","T"][n]}function k(t,e){for(var i=[],n=0;n<t.length;n++)i.push([t[n],e[n]]);var a=function(t,e){var i=e[0]-t[0],n=e[1]-t[1];return {length:Math.sqrt(Math.pow(i,2)+Math.pow(n,2)),angle:Math.atan2(n,i)}},s=function(t,e,i,n){var s=a(e||t,i||t),r=s.angle+(n?Math.PI:0),o=.2*s.length;return [t[0]+Math.cos(r)*o,t[1]+Math.sin(r)*o]};return function(t,e){return t.reduce(function(t,i,n,a){return 0===n?i[0]+","+i[1]:t+" "+e(i,n,a)},"")}(i,function(t,e,i){var n=s(i[e-1],i[e-2],t),a=s(t,i[e-1],i[e+1],!0);return "C "+n[0]+","+n[1]+" "+a[0]+","+a[1]+" "+t[0]+","+t[1]})}function w(t){return t>255?255:t<0?0:t}function A(t,e){var i=ie(t),n=!1;"#"==i[0]&&(i=i.slice(1),n=!0);var a=parseInt(i,16),s=w((a>>16)+e),r=w((a>>8&255)+e),o=w((255&a)+e);return (n?"#":"")+(o|r<<8|s<<16).toString(16)}function P(t){var e=/(^\s*)(rgb|hsl)(a?)[(]\s*([\d.]+\s*%?)\s*,\s*([\d.]+\s*%?)\s*,\s*([\d.]+\s*%?)\s*(?:,\s*([\d.]+)\s*)?[)]$/i;return /(^\s*)(#)((?:[A-Fa-f0-9]{3}){1,2})$/i.test(t)||e.test(t)}function T(t,e){return "string"==typeof t?(e||document).querySelector(t):t||null}function L(t,e){var i=document.createElementNS("http://www.w3.org/2000/svg",t);for(var n in e){var a=e[n];if("inside"===n)T(a).appendChild(i);else if("around"===n){var s=T(a);s.parentNode.insertBefore(i,s),i.appendChild(s);}else "styles"===n?"object"===(void 0===a?"undefined":Ht(a))&&Object.keys(a).map(function(t){i.style[t]=a[t];}):("className"===n&&(n="class"),"innerHTML"===n?i.textContent=a:i.setAttribute(n,a));}return i}function M(t,e){return L("linearGradient",{inside:t,id:e,x1:0,x2:0,y1:0,y2:1})}function C(t,e,i,n){return L("stop",{inside:t,style:"stop-color: "+i,offset:e,"stop-opacity":n})}function O(t,e,i,n){return L("svg",{className:e,inside:t,width:i,height:n})}function D(t){return L("defs",{inside:t})}function N(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"",i=arguments.length>2&&void 0!==arguments[2]?arguments[2]:void 0,n={className:t,transform:e};return i&&(n.inside=i),L("g",n)}function S(t){return L("path",{className:arguments.length>1&&void 0!==arguments[1]?arguments[1]:"",d:t,styles:{stroke:arguments.length>2&&void 0!==arguments[2]?arguments[2]:"none",fill:arguments.length>3&&void 0!==arguments[3]?arguments[3]:"none","stroke-width":arguments.length>4&&void 0!==arguments[4]?arguments[4]:2}})}function E(t,e,i,n){var a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:1,s=arguments.length>5&&void 0!==arguments[5]?arguments[5]:0,r=i.x+t.x,o=i.y+t.y,l=i.x+e.x,u=i.y+e.y;return "M"+i.x+" "+i.y+"\n\t\tL"+r+" "+o+"\n\t\tA "+n+" "+n+" 0 "+s+" "+(a?1:0)+"\n\t\t"+l+" "+u+" z"}function _(t,e,i,n){var a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:1,s=arguments.length>5&&void 0!==arguments[5]?arguments[5]:0,r=i.x+t.x,o=i.y+t.y,l=i.x+e.x,u=2*i.y,h=i.y+e.y;return "M"+i.x+" "+i.y+"\n\t\tL"+r+" "+o+"\n\t\tA "+n+" "+n+" 0 "+s+" "+(a?1:0)+"\n\t\t"+l+" "+u+" z\n\t\tL"+r+" "+u+"\n\t\tA "+n+" "+n+" 0 "+s+" "+(a?1:0)+"\n\t\t"+l+" "+h+" z"}function z(t,e,i,n){var a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:1,s=arguments.length>5&&void 0!==arguments[5]?arguments[5]:0,r=i.x+t.x,o=i.y+t.y,l=i.x+e.x,u=i.y+e.y;return "M"+r+" "+o+"\n\t\tA "+n+" "+n+" 0 "+s+" "+(a?1:0)+"\n\t\t"+l+" "+u}function W(t,e,i,n){var a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:1,s=arguments.length>5&&void 0!==arguments[5]?arguments[5]:0,r=i.x+t.x,o=i.y+t.y,l=i.x+e.x,u=2*n+o,h=i.y+t.y;return "M"+r+" "+o+"\n\t\tA "+n+" "+n+" 0 "+s+" "+(a?1:0)+"\n\t\t"+l+" "+u+"\n\t\tM"+r+" "+u+"\n\t\tA "+n+" "+n+" 0 "+s+" "+(a?1:0)+"\n\t\t"+l+" "+h}function j(t,e){var i=arguments.length>2&&void 0!==arguments[2]&&arguments[2],n="path-fill-gradient-"+e+"-"+(i?"lighter":"default"),a=M(t,n),s=[1,.6,.2];return i&&(s=[.4,.2,0]),C(a,"0%",e,s[0]),C(a,"50%",e,s[1]),C(a,"100%",e,s[2]),n}function H(t,e,i,n){var a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:Jt,s=arguments.length>5&&void 0!==arguments[5]?arguments[5]:"none";return L("rect",{className:"percentage-bar",x:t,y:e,width:i,height:n,fill:s,styles:{stroke:A(s,-25),"stroke-dasharray":"0, "+(n+i)+", "+i+", "+n,"stroke-width":a}})}function F(t,e,i,n,a){var s=arguments.length>5&&void 0!==arguments[5]?arguments[5]:"none",r=arguments.length>6&&void 0!==arguments[6]?arguments[6]:{},o={className:t,x:e,y:i,width:n,height:n,rx:a,fill:s};return Object.keys(r).map(function(t){o[t]=r[t];}),L("rect",o)}function I(t,e,i){var n=arguments.length>3&&void 0!==arguments[3]?arguments[3]:"none",a=arguments[4];a=arguments.length>5&&void 0!==arguments[5]&&arguments[5]?b(a,se):a;var s={className:"legend-bar",x:0,y:0,width:i,height:"2px",fill:n},r=L("text",{className:"legend-dataset-text",x:0,y:0,dy:2*re+"px","font-size":1.2*re+"px","text-anchor":"start",fill:le,innerHTML:a}),o=L("g",{transform:"translate("+t+", "+e+")"});return o.appendChild(L("rect",s)),o.appendChild(r),o}function R(t,e,i){var n=arguments.length>3&&void 0!==arguments[3]?arguments[3]:"none",a=arguments[4];a=arguments.length>5&&void 0!==arguments[5]&&arguments[5]?b(a,se):a;var s={className:"legend-dot",cx:0,cy:0,r:i,fill:n},r=L("text",{className:"legend-dataset-text",x:0,y:0,dx:re+"px",dy:re/3+"px","font-size":1.2*re+"px","text-anchor":"start",fill:le,innerHTML:a}),o=L("g",{transform:"translate("+t+", "+e+")"});return o.appendChild(L("circle",s)),o.appendChild(r),o}function Y(t,e,i,n){var a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:{},s=a.fontSize||re;return L("text",{className:t,x:e,y:i,dy:(void 0!==a.dy?a.dy:s/2)+"px","font-size":s+"px",fill:a.fill||le,"text-anchor":a.textAnchor||"start",innerHTML:n})}function B(t,e,i,n){var a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:{};a.stroke||(a.stroke=oe);var s=L("line",{className:"line-vertical "+a.className,x1:0,x2:0,y1:i,y2:n,styles:{stroke:a.stroke}}),r=L("text",{x:0,y:i>n?i+ae:i-ae-re,dy:re+"px","font-size":re+"px","text-anchor":"middle",innerHTML:e+""}),o=L("g",{transform:"translate("+t+", 0)"});return o.appendChild(s),o.appendChild(r),o}function V(t,e,i,n){var a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:{};a.stroke||(a.stroke=oe),a.lineType||(a.lineType=""),a.shortenNumbers&&(e=x(e));var s=L("line",{className:"line-horizontal "+a.className+("dashed"===a.lineType?"dashed":""),x1:i,x2:n,y1:0,y2:0,styles:{stroke:a.stroke}}),r=L("text",{x:i<n?i-ae:i+ae,y:0,dy:re/2-2+"px","font-size":re+"px","text-anchor":i<n?"end":"start",innerHTML:e+""}),o=L("g",{transform:"translate(0, "+t+")","stroke-opacity":1});return 0!==r&&"0"!==r||(o.style.stroke="rgba(27, 31, 35, 0.6)"),o.appendChild(s),o.appendChild(r),o}function U(t,e,i){var n=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{};f(t)||(t=0),n.pos||(n.pos="left"),n.offset||(n.offset=0),n.mode||(n.mode="span"),n.stroke||(n.stroke=oe),n.className||(n.className="");var a=-1*ne,s="span"===n.mode?i+ne:0;return "tick"===n.mode&&"right"===n.pos&&(a=i+ne,s=i),a+=n.offset,s+=n.offset,V(t,e,a,s,{stroke:n.stroke,className:n.className,lineType:n.lineType,shortenNumbers:n.shortenNumbers})}function G(t,e,i){var n=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{};f(t)||(t=0),n.pos||(n.pos="bottom"),n.offset||(n.offset=0),n.mode||(n.mode="span"),n.stroke||(n.stroke=oe),n.className||(n.className="");var a=i+ne,s="span"===n.mode?-1*ne:i;return "tick"===n.mode&&"top"===n.pos&&(a=-1*ne,s=0),B(t,e,a,s,{stroke:n.stroke,className:n.className,lineType:n.lineType})}function q(t,e,i){var n=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{};n.labelPos||(n.labelPos="right");var a=L("text",{className:"chart-label",x:"left"===n.labelPos?ae:i-d(e,5)-ae,y:0,dy:re/-2+"px","font-size":re+"px","text-anchor":"start",innerHTML:e+""}),s=V(t,"",0,i,{stroke:n.stroke||oe,className:n.className||"",lineType:n.lineType});return s.appendChild(a),s}function X(t,e,i,n){var a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:{},s=t-e,r=L("rect",{className:"bar mini",styles:{fill:"rgba(228, 234, 239, 0.49)",stroke:oe,"stroke-dasharray":i+", "+s},x:0,y:0,width:i,height:s});a.labelPos||(a.labelPos="right");var o=L("text",{className:"chart-label",x:"left"===a.labelPos?ae:i-d(n+"",4.5)-ae,y:0,dy:re/-2+"px","font-size":re+"px","text-anchor":"start",innerHTML:n+""}),l=L("g",{transform:"translate(0, "+e+")"});return l.appendChild(r),l.appendChild(o),l}function J(t,e,i,n){var a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:"",s=arguments.length>5&&void 0!==arguments[5]?arguments[5]:0,r=arguments.length>6&&void 0!==arguments[6]?arguments[6]:0,o=arguments.length>7&&void 0!==arguments[7]?arguments[7]:{},l=m(e,o.zeroLine),u=Vt(l,2),h=u[0],c=u[1];c-=r,0===h&&(h=o.minHeight,c-=o.minHeight),f(t)||(t=0),f(c)||(c=0),f(h,!0)||(h=0),f(i,!0)||(i=0);var d=L("rect",{className:"bar mini",style:"fill: "+n,"data-point-index":s,x:t,y:c,width:i,height:h});if((a+="")||a.length){d.setAttribute("y",0),d.setAttribute("x",0);var p=L("text",{className:"data-point-value",x:i/2,y:0,dy:re/2*-1+"px","font-size":re+"px","text-anchor":"middle",innerHTML:a}),v=L("g",{"data-point-index":s,transform:"translate("+t+", "+c+")"});return v.appendChild(d),v.appendChild(p),v}return d}function K(t,e,i,n){var a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:"",s=arguments.length>5&&void 0!==arguments[5]?arguments[5]:0,r=L("circle",{style:"fill: "+n,"data-point-index":s,cx:t,cy:e,r:i});if((a+="")||a.length){r.setAttribute("cy",0),r.setAttribute("cx",0);var o=L("text",{className:"data-point-value",x:0,y:0,dy:re/2*-1-i+"px","font-size":re+"px","text-anchor":"middle",innerHTML:a}),l=L("g",{"data-point-index":s,transform:"translate("+t+", "+e+")"});return l.appendChild(r),l.appendChild(o),l}return r}function $(t,e,i){var n=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{},a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:{},s=e.map(function(e,i){return t[i]+","+e}).join("L");n.spline&&(s=k(t,e));var r=S("M"+s,"line-graph-path",i);if(n.heatline){var o=j(a.svgDefs,i);r.style.stroke="url(#"+o+")";}var l={path:r};if(n.regionFill){var u=j(a.svgDefs,i,!0),h="M"+t[0]+","+a.zeroLine+"L"+s+"L"+t.slice(-1)[0]+","+a.zeroLine;l.region=S(h,"region-fill","none","url(#"+u+")");}return l}function Q(t,e,i,n){var a="string"==typeof e?e:e.join(", ");return [t,{transform:i.join(", ")},n,ve,"translate",{transform:a}]}function Z(t,e,i){return Q(t,[i,0],[e,0],pe)}function tt(t,e,i){return Q(t,[0,i],[0,e],pe)}function et(t,e,i,n){var a=e-i,s=t.childNodes[0];return [[s,{height:a,"stroke-dasharray":s.getAttribute("width")+", "+a},pe,ve],Q(t,[0,n],[0,i],pe)]}function it(t,e,i,n){var a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:0,s=m(i,(arguments.length>5&&void 0!==arguments[5]?arguments[5]:{}).zeroLine),r=Vt(s,2),o=r[0],l=r[1];return l-=a,"rect"!==t.nodeName?[[t.childNodes[0],{width:n,height:o},ce,ve],Q(t,t.getAttribute("transform").split("(")[1].slice(0,-1),[e,l],pe)]:[[t,{width:n,height:o,x:e,y:l},ce,ve]]}function nt(t,e,i){return "circle"!==t.nodeName?[Q(t,t.getAttribute("transform").split("(")[1].slice(0,-1),[e,i],pe)]:[[t,{cx:e,cy:i},ce,ve]]}function at(t,e,i,n,a){var s=[],r=i.map(function(t,i){return e[i]+","+t}).join("L");a&&(r=k(e,i));var o=[t.path,{d:"M"+r},de,ve];if(s.push(o),t.region){var l=e[0]+","+n+"L",u="L"+e.slice(-1)[0]+", "+n,h=[t.region,{d:"M"+l+r+u},de,ve];s.push(h);}return s}function st(t,e){return [t,{d:e},ce,ve]}function rt(t,e,i){var n=arguments.length>3&&void 0!==arguments[3]?arguments[3]:"linear",a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:void 0,s=arguments.length>5&&void 0!==arguments[5]?arguments[5]:{},r=t.cloneNode(!0),o=t.cloneNode(!0);for(var l in e){var u=void 0;u="transform"===l?document.createElementNS("http://www.w3.org/2000/svg","animateTransform"):document.createElementNS("http://www.w3.org/2000/svg","animate");var h=s[l]||t.getAttribute(l),c=e[l],d={attributeName:l,from:h,to:c,begin:"0s",dur:i/1e3+"s",values:h+";"+c,keySplines:ge[n],keyTimes:"0;1",calcMode:"spline",fill:"freeze"};a&&(d.type=a);for(var p in d)u.setAttribute(p,d[p]);r.appendChild(u),a?o.setAttribute(l,"translate("+c+")"):o.setAttribute(l,c);}return [r,o]}function ot(t,e){t.style.transform=e,t.style.webkitTransform=e,t.style.msTransform=e,t.style.mozTransform=e,t.style.oTransform=e;}function lt(t,e){var i=[],n=[];e.map(function(t){var e=t[0],a=e.parentNode,s=void 0,r=void 0;t[0]=e;var o=rt.apply(void 0,Ut(t)),l=Vt(o,2);s=l[0],r=l[1],i.push(r),n.push([s,a]),a&&a.replaceChild(s,e);});var a=t.cloneNode(!0);return n.map(function(t,n){t[1]&&(t[1].replaceChild(i[n],t[0]),e[n][0]=i[n]);}),a}function ut(t,e,i){if(0!==i.length){var n=lt(e,i);e.parentNode==t&&(t.removeChild(e),t.appendChild(n)),setTimeout(function(){n.parentNode==t&&(t.removeChild(n),t.appendChild(e));},fe);}}function ht(t,e){var i=document.createElement("a");i.style="display: none";var n=new Blob(e,{type:"image/svg+xml; charset=utf-8"}),a=window.URL.createObjectURL(n);i.href=a,i.download=t,document.body.appendChild(i),i.click(),setTimeout(function(){document.body.removeChild(i),window.URL.revokeObjectURL(a);},300);}function ct(e){var i=e.cloneNode(!0);i.classList.add("chart-container"),i.setAttribute("xmlns","http://www.w3.org/2000/svg"),i.setAttribute("xmlns:xlink","http://www.w3.org/1999/xlink");var n=t.create("style",{innerHTML:me});i.insertBefore(n,i.firstChild);var a=t.create("div");return a.appendChild(i),a.innerHTML}function dt(t){var e=new Date(t);return e.setMinutes(e.getMinutes()-e.getTimezoneOffset()),e}function pt(t){var e=t.getDate(),i=t.getMonth()+1;return [t.getFullYear(),(i>9?"":"0")+i,(e>9?"":"0")+e].join("-")}function ft(t){return new Date(t.getTime())}function vt(t,e){var i=xt(t);return Math.ceil(gt(i,e)/xe)}function gt(t,e){var i=we*ke;return (dt(e)-dt(t))/i}function mt(t,e){return t.getMonth()===e.getMonth()&&t.getFullYear()===e.getFullYear()}function yt(t){var e=arguments.length>1&&void 0!==arguments[1]&&arguments[1],i=Ae[t];return e?i.slice(0,3):i}function bt(t,e){return new Date(e,t+1,0)}function xt(t){var e=ft(t),i=e.getDay();return 0!==i&&kt(e,-1*i),e}function kt(t,e){t.setDate(t.getDate()+e);}function wt(t,e,i){var n=Object.keys(Le).filter(function(e){return t.includes(e)}),a=Le[n[0]];return Object.assign(a,{constants:e,getData:i}),new Te(a)}function At(t){if(0===t)return [0,0];if(isNaN(t))return {mantissa:-6755399441055744,exponent:972};var e=t>0?1:-1;if(!isFinite(t))return {mantissa:4503599627370496*e,exponent:972};t=Math.abs(t);var i=Math.floor(Math.log10(t));return [e*(t/Math.pow(10,i)),i]}function Pt(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,i=Math.ceil(t),n=Math.floor(e),a=i-n,s=a,r=1;a>5&&(a%2!=0&&(a=++i-n),s=a/2,r=2),a<=2&&(r=a/(s=4)),0===a&&(s=5,r=1);for(var o=[],l=0;l<=s;l++)o.push(n+r*l);return o}function Tt(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,i=At(t),n=Vt(i,2),a=n[0],s=n[1],r=e?e/Math.pow(10,s):0,o=Pt(a=a.toFixed(6),r);return o=o.map(function(t){return t*Math.pow(10,s)})}function Lt(t){function e(t,e){for(var i=Tt(t),n=i[1]-i[0],a=0,s=1;a<e;s++)a+=n,i.unshift(-1*a);return i}var i=arguments.length>1&&void 0!==arguments[1]&&arguments[1],n=Math.max.apply(Math,Ut(t)),a=Math.min.apply(Math,Ut(t)),s=[];if(n>=0&&a>=0)At(n)[1],s=i?Tt(n,a):Tt(n);else if(n>0&&a<0){var r=Math.abs(a);n>=r?(At(n)[1],s=e(n,r)):(At(r)[1],s=e(r,n).reverse().map(function(t){return -1*t}));}else if(n<=0&&a<=0){var o=Math.abs(a),l=Math.abs(n);At(o)[1],s=(s=i?Tt(o,l):Tt(o)).reverse().map(function(t){return -1*t});}return s}function Mt(t){var e=Ct(t);return t.indexOf(0)>=0?t.indexOf(0):t[0]>0?-1*t[0]/e:-1*t[t.length-1]/e+(t.length-1)}function Ct(t){return t[1]-t[0]}function Ot(t){return t[t.length-1]-t[0]}function Dt(t,e){return h(e.zeroLine-t*e.scaleMultiplier)}function Nt(t,e){var i=arguments.length>2&&void 0!==arguments[2]&&arguments[2],n=e.reduce(function(e,i){return Math.abs(i-t)<Math.abs(e-t)?i:e},[]);return i?e.indexOf(n):n}function St(t,e){for(var i=Math.max.apply(Math,Ut(t)),n=1/(e-1),a=[],s=0;s<e;s++){var r=i*(n*s);a.push(r);}return a}function Et(t,e){return e.filter(function(e){return e<t}).length}function _t(t,e){t.labels=t.labels||[];var i=t.labels.length,n=t.datasets,a=new Array(i).fill(0);return n||(n=[{values:a}]),n.map(function(t){if(t.values){var n=t.values;n=(n=n.map(function(t){return isNaN(t)?0:t})).length>i?n.slice(0,i):c(n,i-n.length,0);}else t.values=a;t.chartType||(t.chartType=e);}),t.yRegions&&t.yRegions.map(function(t){if(t.end<t.start){var e=[t.end,t.start];t.start=e[0],t.end=e[1];}}),t}function zt(t){var e=t.labels.length,i=new Array(e).fill(0),n={labels:t.labels.slice(0,-1),datasets:t.datasets.map(function(t){return {name:"",values:i.slice(0,-1),chartType:t.chartType}})};return t.yMarkers&&(n.yMarkers=[{value:0,label:""}]),t.yRegions&&(n.yRegions=[{start:0,end:0,label:""}]),n}function Wt(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:[],i=!(arguments.length>2&&void 0!==arguments[2])||arguments[2],n=t/e.length;n<=0&&(n=1);var a=n/Kt,s=void 0;if(i){var r=Math.max.apply(Math,Ut(e.map(function(t){return t.length})));s=Math.ceil(r/a);}return e.map(function(t,e){return (t+="").length>a&&(i?e%s!=0&&(t=""):t=a-3>0?t.slice(0,a-3)+" ...":t.slice(0,a)+".."),t})}function jt(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"line",e=arguments[1],i=arguments[2];return "axis-mixed"===t?(i.type="line",new De(e,i)):Se[t]?new Se[t](e,i):void console.error("Undefined chart type: "+t)}!function(t,e){void 0===e&&(e={});var i=e.insertAt;if(t&&"undefined"!=typeof document){var n=document.head||document.getElementsByTagName("head")[0],a=document.createElement("style");a.type="text/css","top"===i&&n.firstChild?n.insertBefore(a,n.firstChild):n.appendChild(a),a.styleSheet?a.styleSheet.cssText=t:a.appendChild(document.createTextNode(t));}}('.chart-container{position:relative;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Fira Sans,Droid Sans,Helvetica Neue,sans-serif}.chart-container .axis,.chart-container .chart-label{fill:#555b51}.chart-container .axis line,.chart-container .chart-label line{stroke:#dadada}.chart-container .dataset-units circle{stroke:#fff;stroke-width:2}.chart-container .dataset-units path{fill:none;stroke-opacity:1;stroke-width:2px}.chart-container .dataset-path{stroke-width:2px}.chart-container .path-group path{fill:none;stroke-opacity:1;stroke-width:2px}.chart-container line.dashed{stroke-dasharray:5,3}.chart-container .axis-line .specific-value{text-anchor:start}.chart-container .axis-line .y-line{text-anchor:end}.chart-container .axis-line .x-line{text-anchor:middle}.chart-container .legend-dataset-text{fill:#6c7680;font-weight:600}.graph-svg-tip{position:absolute;z-index:99999;padding:10px;font-size:12px;color:#959da5;text-align:center;background:rgba(0,0,0,.8);border-radius:3px}.graph-svg-tip ol,.graph-svg-tip ul{padding-left:0;display:-webkit-box;display:-ms-flexbox;display:flex}.graph-svg-tip ul.data-point-list li{min-width:90px;-webkit-box-flex:1;-ms-flex:1;flex:1;font-weight:600}.graph-svg-tip strong{color:#dfe2e5;font-weight:600}.graph-svg-tip .svg-pointer{position:absolute;height:5px;margin:0 0 0 -5px;content:" ";border:5px solid transparent;border-top-color:rgba(0,0,0,.8)}.graph-svg-tip.comparison{padding:0;text-align:left;pointer-events:none}.graph-svg-tip.comparison .title{display:block;padding:10px;margin:0;font-weight:600;line-height:1;pointer-events:none}.graph-svg-tip.comparison ul{margin:0;white-space:nowrap;list-style:none}.graph-svg-tip.comparison li{display:inline-block;padding:5px 10px}');var Ht="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},Ft=(function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}),It=function(){function t(t,e){for(var i=0;i<e.length;i++){var n=e[i];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n);}}return function(e,i,n){return i&&t(e.prototype,i),n&&t(e,n),e}}(),Rt=function t(e,i,n){null===e&&(e=Function.prototype);var a=Object.getOwnPropertyDescriptor(e,i);if(void 0===a){var s=Object.getPrototypeOf(e);return null===s?void 0:t(s,i,n)}if("value"in a)return a.value;var r=a.get;if(void 0!==r)return r.call(n)},Yt=function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e);},Bt=function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return !e||"object"!=typeof e&&"function"!=typeof e?t:e},Vt=function(){function t(t,e){var i=[],n=!0,a=!1,s=void 0;try{for(var r,o=t[Symbol.iterator]();!(n=(r=o.next()).done)&&(i.push(r.value),!e||i.length!==e);n=!0);}catch(t){a=!0,s=t;}finally{try{!n&&o.return&&o.return();}finally{if(a)throw s}}return i}return function(e,i){if(Array.isArray(e))return e;if(Symbol.iterator in Object(e))return t(e,i);throw new TypeError("Invalid attempt to destructure non-iterable instance")}}(),Ut=function(t){if(Array.isArray(t)){for(var e=0,i=Array(t.length);e<t.length;e++)i[e]=t[e];return i}return Array.from(t)};t.create=function(e,i){var n=document.createElement(e);for(var a in i){var s=i[a];if("inside"===a)t(s).appendChild(n);else if("around"===a){var r=t(s);r.parentNode.insertBefore(n,r),n.appendChild(r);}else "styles"===a?"object"===(void 0===s?"undefined":Ht(s))&&Object.keys(s).map(function(t){n.style[t]=s[t];}):a in n?n[a]=s:n.setAttribute(a,s);}return n};var Gt={margins:{top:10,bottom:10,left:20,right:20},paddings:{top:20,bottom:40,left:30,right:10},baseHeight:240,titleHeight:20,legendHeight:30,titleFontSize:12},qt=700,Jt=2,Kt=7,$t=["light-blue","blue","violet","red","orange","yellow","green","light-green","purple","magenta","light-grey","dark-grey"],Qt={bar:$t,line:$t,pie:$t,percentage:$t,heatmap:["#ebedf0","#c6e48b","#7bc96f","#239a3b","#196127"],donut:$t},Zt=Math.PI/180,te=function(){function e(t){var i=t.parent,n=void 0===i?null:i,a=t.colors,s=void 0===a?[]:a;Ft(this,e),this.parent=n,this.colors=s,this.titleName="",this.titleValue="",this.listValues=[],this.titleValueFirst=0,this.x=0,this.y=0,this.top=0,this.left=0,this.setup();}return It(e,[{key:"setup",value:function(){this.makeTooltip();}},{key:"refresh",value:function(){this.fill(),this.calcPosition();}},{key:"makeTooltip",value:function(){var e=this;this.container=t.create("div",{inside:this.parent,className:"graph-svg-tip comparison",innerHTML:'<span class="title"></span>\n\t\t\t\t<ul class="data-point-list"></ul>\n\t\t\t\t<div class="svg-pointer"></div>'}),this.hideTip(),this.title=this.container.querySelector(".title"),this.dataPointList=this.container.querySelector(".data-point-list"),this.parent.addEventListener("mouseleave",function(){e.hideTip();});}},{key:"fill",value:function(){var e=this,i=void 0;this.index&&this.container.setAttribute("data-point-index",this.index),i=this.titleValueFirst?"<strong>"+this.titleValue+"</strong>"+this.titleName:this.titleName+"<strong>"+this.titleValue+"</strong>",this.title.innerHTML=i,this.dataPointList.innerHTML="",this.listValues.map(function(i,n){var a=e.colors[n]||"black",s=0===i.formatted||i.formatted?i.formatted:i.value,r=t.create("li",{styles:{"border-top":"3px solid "+a},innerHTML:'<strong style="display: block;">'+(0===s||s?s:"")+"</strong>\n\t\t\t\t\t"+(i.title?i.title:"")});e.dataPointList.appendChild(r);});}},{key:"calcPosition",value:function(){var t=this.container.offsetWidth;this.top=this.y-this.container.offsetHeight-5,this.left=this.x-t/2;var e=this.parent.offsetWidth-t,i=this.container.querySelector(".svg-pointer");if(this.left<0)i.style.left="calc(50% - "+-1*this.left+"px)",this.left=0;else if(this.left>e){var n="calc(50% + "+(this.left-e)+"px)";i.style.left=n,this.left=e;}else i.style.left="50%";}},{key:"setValues",value:function(t,e){var i=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},n=arguments.length>3&&void 0!==arguments[3]?arguments[3]:[],a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:-1;this.titleName=i.name,this.titleValue=i.value,this.listValues=n,this.x=t,this.y=e,this.titleValueFirst=i.valueFirst||0,this.index=a,this.refresh();}},{key:"hideTip",value:function(){this.container.style.top="0px",this.container.style.left="0px",this.container.style.opacity="0";}},{key:"showTip",value:function(){this.container.style.top=this.top+"px",this.container.style.left=this.left+"px",this.container.style.opacity="1";}}]),e}(),ee={"light-blue":"#7cd6fd",blue:"#5e64ff",violet:"#743ee2",red:"#ff5858",orange:"#ffa00a",yellow:"#feef72",green:"#28a745","light-green":"#98d85b",purple:"#b554ff",magenta:"#ffa3ef",black:"#36114C",grey:"#bdd3e6","light-grey":"#f0f4f7","dark-grey":"#b8c2cc"},ie=function(t){return /rgb[a]{0,1}\([\d, ]+\)/gim.test(t)?/\D+(\d*)\D+(\d*)\D+(\d*)/gim.exec(t).map(function(t,e){return 0!==e?Number(t).toString(16):"#"}).reduce(function(t,e){return ""+t+e}):ee[t]||t},ne=6,ae=4,se=15,re=10,oe="#dadada",le="#555b51",ue={bar:function(t){var e=void 0;"rect"!==t.nodeName&&(e=t.getAttribute("transform"),t=t.childNodes[0]);var i=t.cloneNode();return i.style.fill="#000000",i.style.opacity="0.4",e&&i.setAttribute("transform",e),i},dot:function(t){var e=void 0;"circle"!==t.nodeName&&(e=t.getAttribute("transform"),t=t.childNodes[0]);var i=t.cloneNode(),n=t.getAttribute("r"),a=t.getAttribute("fill");return i.setAttribute("r",parseInt(n)+4),i.setAttribute("fill",a),i.style.opacity="0.6",e&&i.setAttribute("transform",e),i},heat_square:function(t){var e=void 0;"circle"!==t.nodeName&&(e=t.getAttribute("transform"),t=t.childNodes[0]);var i=t.cloneNode(),n=t.getAttribute("r"),a=t.getAttribute("fill");return i.setAttribute("r",parseInt(n)+4),i.setAttribute("fill",a),i.style.opacity="0.6",e&&i.setAttribute("transform",e),i}},he={bar:function(t,e){var i=void 0;"rect"!==t.nodeName&&(i=t.getAttribute("transform"),t=t.childNodes[0]);var n=["x","y","width","height"];Object.values(t.attributes).filter(function(t){return n.includes(t.name)&&t.specified}).map(function(t){e.setAttribute(t.name,t.nodeValue);}),i&&e.setAttribute("transform",i);},dot:function(t,e){var i=void 0;"circle"!==t.nodeName&&(i=t.getAttribute("transform"),t=t.childNodes[0]);var n=["cx","cy"];Object.values(t.attributes).filter(function(t){return n.includes(t.name)&&t.specified}).map(function(t){e.setAttribute(t.name,t.nodeValue);}),i&&e.setAttribute("transform",i);},heat_square:function(t,e){var i=void 0;"circle"!==t.nodeName&&(i=t.getAttribute("transform"),t=t.childNodes[0]);var n=["cx","cy"];Object.values(t.attributes).filter(function(t){return n.includes(t.name)&&t.specified}).map(function(t){e.setAttribute(t.name,t.nodeValue);}),i&&e.setAttribute("transform",i);}},ce=350,de=350,pe=ce,fe=250,ve="easein",ge={ease:"0.25 0.1 0.25 1",linear:"0 0 1 1",easein:"0.1 0.8 0.2 1",easeout:"0 0 0.58 1",easeinout:"0.42 0 0.58 1"},me=".chart-container{position:relative;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif}.chart-container .axis,.chart-container .chart-label{fill:#555b51}.chart-container .axis line,.chart-container .chart-label line{stroke:#dadada}.chart-container .dataset-units circle{stroke:#fff;stroke-width:2}.chart-container .dataset-units path{fill:none;stroke-opacity:1;stroke-width:2px}.chart-container .dataset-path{stroke-width:2px}.chart-container .path-group path{fill:none;stroke-opacity:1;stroke-width:2px}.chart-container line.dashed{stroke-dasharray:5,3}.chart-container .axis-line .specific-value{text-anchor:start}.chart-container .axis-line .y-line{text-anchor:end}.chart-container .axis-line .x-line{text-anchor:middle}.chart-container .legend-dataset-text{fill:#6c7680;font-weight:600}.graph-svg-tip{position:absolute;z-index:99999;padding:10px;font-size:12px;color:#959da5;text-align:center;background:rgba(0,0,0,.8);border-radius:3px}.graph-svg-tip ul{padding-left:0;display:flex}.graph-svg-tip ol{padding-left:0;display:flex}.graph-svg-tip ul.data-point-list li{min-width:90px;flex:1;font-weight:600}.graph-svg-tip strong{color:#dfe2e5;font-weight:600}.graph-svg-tip .svg-pointer{position:absolute;height:5px;margin:0 0 0 -5px;content:' ';border:5px solid transparent;border-top-color:rgba(0,0,0,.8)}.graph-svg-tip.comparison{padding:0;text-align:left;pointer-events:none}.graph-svg-tip.comparison .title{display:block;padding:10px;margin:0;font-weight:600;line-height:1;pointer-events:none}.graph-svg-tip.comparison ul{margin:0;white-space:nowrap;list-style:none}.graph-svg-tip.comparison li{display:inline-block;padding:5px 10px}",ye=function(){function e(t,i){if(Ft(this,e),i=g(i),this.parent="string"==typeof t?document.querySelector(t):t,!(this.parent instanceof HTMLElement))throw new Error("No `parent` element to render on was provided.");this.rawChartArgs=i,this.title=i.title||"",this.type=i.type||"",this.realData=this.prepareData(i.data),this.data=this.prepareFirstData(this.realData),this.colors=this.validateColors(i.colors,this.type),this.config={showTooltip:1,showLegend:1,isNavigable:i.isNavigable||0,animate:void 0!==i.animate?i.animate:1,truncateLegends:i.truncateLegends||1},this.measures=JSON.parse(JSON.stringify(Gt));var n=this.measures;this.setMeasures(i),this.title.length||(n.titleHeight=0),this.config.showLegend||(n.legendHeight=0),this.argHeight=i.height||n.baseHeight,this.state={},this.options={},this.initTimeout=qt,this.config.isNavigable&&(this.overlays=[]),this.configure(i);}return It(e,[{key:"prepareData",value:function(t){return t}},{key:"prepareFirstData",value:function(t){return t}},{key:"validateColors",value:function(t,e){var i=[];return (t=(t||[]).concat(Qt[e])).forEach(function(t){var e=ie(t);P(e)?i.push(e):console.warn('"'+t+'" is not a valid color.');}),i}},{key:"setMeasures",value:function(){}},{key:"configure",value:function(){var t=this,e=this.argHeight;this.baseHeight=e,this.height=e-l(this.measures),this.boundDrawFn=function(){return t.draw(!0)},window.addEventListener("resize",this.boundDrawFn),window.addEventListener("orientationchange",this.boundDrawFn);}},{key:"destroy",value:function(){window.removeEventListener("resize",this.boundDrawFn),window.removeEventListener("orientationchange",this.boundDrawFn);}},{key:"setup",value:function(){this.makeContainer(),this.updateWidth(),this.makeTooltip(),this.draw(!1,!0);}},{key:"makeContainer",value:function(){this.parent.innerHTML="";var e={inside:this.parent,className:"chart-container"};this.independentWidth&&(e.styles={width:this.independentWidth+"px"}),this.container=t.create("div",e);}},{key:"makeTooltip",value:function(){this.tip=new te({parent:this.container,colors:this.colors}),this.bindTooltip();}},{key:"bindTooltip",value:function(){}},{key:"draw",value:function(){var t=this,e=arguments.length>0&&void 0!==arguments[0]&&arguments[0],n=arguments.length>1&&void 0!==arguments[1]&&arguments[1];e&&i(this.parent)||(this.updateWidth(),this.calc(e),this.makeChartArea(),this.setupComponents(),this.components.forEach(function(e){return e.setup(t.drawArea)}),this.render(this.components,!1),n&&(this.data=this.realData,setTimeout(function(){t.update(t.data);},this.initTimeout)),this.renderLegend(),this.setupNavigation(n));}},{key:"calc",value:function(){}},{key:"updateWidth",value:function(){this.baseWidth=a(this.parent),this.width=this.baseWidth-u(this.measures);}},{key:"makeChartArea",value:function(){this.svg&&this.container.removeChild(this.svg);var t=this.measures;this.svg=O(this.container,"frappe-chart chart",this.baseWidth,this.baseHeight),this.svgDefs=D(this.svg),this.title.length&&(this.titleEL=Y("title",t.margins.left,t.margins.top,this.title,{fontSize:t.titleFontSize,fill:"#666666",dy:t.titleFontSize}));var e=r(t);this.drawArea=N(this.type+"-chart chart-draw-area","translate("+o(t)+", "+e+")"),this.config.showLegend&&(e+=this.height+t.paddings.bottom,this.legendArea=N("chart-legend","translate("+o(t)+", "+e+")")),this.title.length&&this.svg.appendChild(this.titleEL),this.svg.appendChild(this.drawArea),this.config.showLegend&&this.svg.appendChild(this.legendArea),this.updateTipOffset(o(t),r(t));}},{key:"updateTipOffset",value:function(t,e){this.tip.offset={x:t,y:e};}},{key:"setupComponents",value:function(){this.components=new Map;}},{key:"update",value:function(t){t||console.error("No data to update."),this.data=this.prepareData(t),this.calc(),this.render(this.components,this.config.animate),this.renderLegend();}},{key:"render",value:function(){var t=this,e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:this.components,i=!(arguments.length>1&&void 0!==arguments[1])||arguments[1];this.config.isNavigable&&this.overlays.map(function(t){return t.parentNode.removeChild(t)});var n=[];e.forEach(function(t){n=n.concat(t.update(i));}),n.length>0?(ut(this.container,this.svg,n),setTimeout(function(){e.forEach(function(t){return t.make()}),t.updateNav();},400)):(e.forEach(function(t){return t.make()}),this.updateNav());}},{key:"updateNav",value:function(){this.config.isNavigable&&(this.makeOverlay(),this.bindUnits());}},{key:"renderLegend",value:function(){}},{key:"setupNavigation",value:function(){var t=this,e=arguments.length>0&&void 0!==arguments[0]&&arguments[0];this.config.isNavigable&&e&&(this.bindOverlay(),this.keyActions={13:this.onEnterKey.bind(this),37:this.onLeftArrow.bind(this),38:this.onUpArrow.bind(this),39:this.onRightArrow.bind(this),40:this.onDownArrow.bind(this)},document.addEventListener("keydown",function(e){n(t.container)&&(e=e||window.event,t.keyActions[e.keyCode]&&t.keyActions[e.keyCode]());}));}},{key:"makeOverlay",value:function(){}},{key:"updateOverlay",value:function(){}},{key:"bindOverlay",value:function(){}},{key:"bindUnits",value:function(){}},{key:"onLeftArrow",value:function(){}},{key:"onRightArrow",value:function(){}},{key:"onUpArrow",value:function(){}},{key:"onDownArrow",value:function(){}},{key:"onEnterKey",value:function(){}},{key:"addDataPoint",value:function(){}},{key:"removeDataPoint",value:function(){}},{key:"getDataPoint",value:function(){}},{key:"setCurrentDataPoint",value:function(){}},{key:"updateDataset",value:function(){}},{key:"export",value:function(){var t=ct(this.svg);ht(this.title||"Chart",[t]);}}]),e}(),be=function(t){function e(t,i){return Ft(this,e),Bt(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,t,i))}return Yt(e,t),It(e,[{key:"configure",value:function(t){Rt(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"configure",this).call(this,t),this.config.formatTooltipY=(t.tooltipOptions||{}).formatTooltipY,this.config.maxSlices=t.maxSlices||20,this.config.maxLegendPoints=t.maxLegendPoints||20;}},{key:"calc",value:function(){var t=this,e=this.state,i=this.config.maxSlices;e.sliceTotals=[];var n=this.data.labels.map(function(e,i){var n=0;return t.data.datasets.map(function(t){n+=t.values[i];}),[n,e]}).filter(function(t){return t[0]>=0}),a=n;if(n.length>i){n.sort(function(t,e){return e[0]-t[0]}),a=n.slice(0,i-1);var s=0;n.slice(i-1).map(function(t){s+=t[0];}),a.push([s,"Rest"]),this.colors[i-1]="grey";}e.labels=[],a.map(function(t){e.sliceTotals.push(v(t[0])),e.labels.push(t[1]);}),e.grandTotal=e.sliceTotals.reduce(function(t,e){return t+e},0),this.center={x:this.width/2,y:this.height/2};}},{key:"renderLegend",value:function(){var t=this,e=this.state;this.legendArea.textContent="",this.legendTotals=e.sliceTotals.slice(0,this.config.maxLegendPoints);var i=0,n=0;this.legendTotals.map(function(a,s){var r=150,o=Math.floor((t.width-u(t.measures))/r);t.legendTotals.length<o&&(r=t.width/t.legendTotals.length),i>o&&(i=0,n+=20);var l=r*i+5,h=t.config.truncateLegends?b(e.labels[s],r/10):e.labels[s],c=t.config.formatTooltipY?t.config.formatTooltipY(a):a,d=R(l,n,5,t.colors[s],h+": "+c,!1);t.legendArea.appendChild(d),i++;});}}]),e}(ye),xe=7,ke=1e3,we=86400,Ae=["January","February","March","April","May","June","July","August","September","October","November","December"],Pe=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],Te=function(){function t(e){var i=e.layerClass,n=void 0===i?"":i,a=e.layerTransform,s=void 0===a?"":a,r=e.constants,o=e.getData,l=e.makeElements,u=e.animateElements;Ft(this,t),this.layerTransform=s,this.constants=r,this.makeElements=l,this.getData=o,this.animateElements=u,this.store=[],this.labels=[],this.layerClass=n,this.layerClass="function"==typeof this.layerClass?this.layerClass():this.layerClass,this.refresh();}return It(t,[{key:"refresh",value:function(t){this.data=t||this.getData();}},{key:"setup",value:function(t){this.layer=N(this.layerClass,this.layerTransform,t);}},{key:"make",value:function(){this.render(this.data),this.oldData=this.data;}},{key:"render",value:function(t){var e=this;this.store=this.makeElements(t),this.layer.textContent="",this.store.forEach(function(t){e.layer.appendChild(t);}),this.labels.forEach(function(t){e.layer.appendChild(t);});}},{key:"update",value:function(){var t=!(arguments.length>0&&void 0!==arguments[0])||arguments[0];this.refresh();var e=[];return t&&(e=this.animateElements(this.data)||[]),e}}]),t}(),Le={donutSlices:{layerClass:"donut-slices",makeElements:function(t){return t.sliceStrings.map(function(e,i){var n=S(e,"donut-path",t.colors[i],"none",t.strokeWidth);return n.style.transition="transform .3s;",n})},animateElements:function(t){return this.store.map(function(e,i){return st(e,t.sliceStrings[i])})}},pieSlices:{layerClass:"pie-slices",makeElements:function(t){return t.sliceStrings.map(function(e,i){var n=S(e,"pie-path","none",t.colors[i]);return n.style.transition="transform .3s;",n})},animateElements:function(t){return this.store.map(function(e,i){return st(e,t.sliceStrings[i])})}},percentageBars:{layerClass:"percentage-bars",makeElements:function(t){var e=this;return t.xPositions.map(function(i,n){return H(i,0,t.widths[n],e.constants.barHeight,e.constants.barDepth,t.colors[n])})},animateElements:function(t){if(t)return []}},yAxis:{layerClass:"y axis",makeElements:function(t){var e=this;return t.positions.map(function(i,n){return U(i,t.labels[n],e.constants.width,{mode:e.constants.mode,pos:e.constants.pos,shortenNumbers:e.constants.shortenNumbers})})},animateElements:function(t){var e=t.positions,i=t.labels,n=this.oldData.positions,a=this.oldData.labels,s=y(n,e),r=Vt(s,2);n=r[0],e=r[1];var o=y(a,i),l=Vt(o,2);return a=l[0],i=l[1],this.render({positions:n,labels:i}),this.store.map(function(t,i){return tt(t,e[i],n[i])})}},xAxis:{layerClass:"x axis",makeElements:function(t){var e=this;return t.positions.map(function(i,n){return G(i,t.calcLabels[n],e.constants.height,{mode:e.constants.mode,pos:e.constants.pos})})},animateElements:function(t){var e=t.positions,i=t.calcLabels,n=this.oldData.positions,a=this.oldData.calcLabels,s=y(n,e),r=Vt(s,2);n=r[0],e=r[1];var o=y(a,i),l=Vt(o,2);return a=l[0],i=l[1],this.render({positions:n,calcLabels:i}),this.store.map(function(t,i){return Z(t,e[i],n[i])})}},yMarkers:{layerClass:"y-markers",makeElements:function(t){var e=this;return t.map(function(t){return q(t.position,t.label,e.constants.width,{labelPos:t.options.labelPos,mode:"span",lineType:"dashed"})})},animateElements:function(t){var e=y(this.oldData,t),i=Vt(e,2);this.oldData=i[0];var n=(t=i[1]).map(function(t){return t.position}),a=t.map(function(t){return t.label}),s=t.map(function(t){return t.options}),r=this.oldData.map(function(t){return t.position});return this.render(r.map(function(t,e){return {position:r[e],label:a[e],options:s[e]}})),this.store.map(function(t,e){return tt(t,n[e],r[e])})}},yRegions:{layerClass:"y-regions",makeElements:function(t){var e=this;return t.map(function(t){return X(t.startPos,t.endPos,e.constants.width,t.label,{labelPos:t.options.labelPos})})},animateElements:function(t){var e=y(this.oldData,t),i=Vt(e,2);this.oldData=i[0];var n=(t=i[1]).map(function(t){return t.endPos}),a=t.map(function(t){return t.label}),s=t.map(function(t){return t.startPos}),r=t.map(function(t){return t.options}),o=this.oldData.map(function(t){return t.endPos}),l=this.oldData.map(function(t){return t.startPos});this.render(o.map(function(t,e){return {startPos:l[e],endPos:o[e],label:a[e],options:r[e]}}));var u=[];return this.store.map(function(t,e){u=u.concat(et(t,s[e],n[e],o[e]));}),u}},heatDomain:{layerClass:function(){return "heat-domain domain-"+this.constants.index},makeElements:function(t){var e=this,i=this.constants,n=i.index,a=i.colWidth,s=i.rowHeight,r=i.squareSize,o=i.radius,l=i.xTranslate,u=0;return this.serializedSubDomains=[],t.cols.map(function(t,i){1===i&&e.labels.push(Y("domain-name",l,-12,yt(n,!0).toUpperCase(),{fontSize:9})),t.map(function(t,i){if(t.fill){var n={"data-date":t.yyyyMmDd,"data-value":t.dataValue,"data-day":i},a=F("day",l,u,r,o,t.fill,n);e.serializedSubDomains.push(a);}u+=s;}),u=0,l+=a;}),this.serializedSubDomains},animateElements:function(t){if(t)return []}},barGraph:{layerClass:function(){return "dataset-units dataset-bars dataset-"+this.constants.index},makeElements:function(t){var e=this.constants;return this.unitType="bar",this.units=t.yPositions.map(function(i,n){return J(t.xPositions[n],i,t.barWidth,e.color,t.labels[n],n,t.offsets[n],{zeroLine:t.zeroLine,barsWidth:t.barsWidth,minHeight:e.minHeight})}),this.units},animateElements:function(t){var e=t.xPositions,i=t.yPositions,n=t.offsets,a=t.labels,s=this.oldData.xPositions,r=this.oldData.yPositions,o=this.oldData.offsets,l=this.oldData.labels,u=y(s,e),h=Vt(u,2);s=h[0],e=h[1];var c=y(r,i),d=Vt(c,2);r=d[0],i=d[1];var p=y(o,n),f=Vt(p,2);o=f[0],n=f[1];var v=y(l,a),g=Vt(v,2);l=g[0],a=g[1],this.render({xPositions:s,yPositions:r,offsets:o,labels:a,zeroLine:this.oldData.zeroLine,barsWidth:this.oldData.barsWidth,barWidth:this.oldData.barWidth});var m=[];return this.store.map(function(a,s){m=m.concat(it(a,e[s],i[s],t.barWidth,n[s],{zeroLine:t.zeroLine}));}),m}},lineGraph:{layerClass:function(){return "dataset-units dataset-line dataset-"+this.constants.index},makeElements:function(t){var e=this.constants;return this.unitType="dot",this.paths={},e.hideLine||(this.paths=$(t.xPositions,t.yPositions,e.color,{heatline:e.heatline,regionFill:e.regionFill,spline:e.spline},{svgDefs:e.svgDefs,zeroLine:t.zeroLine})),this.units=[],e.hideDots||(this.units=t.yPositions.map(function(i,n){return K(t.xPositions[n],i,t.radius,e.color,e.valuesOverPoints?t.values[n]:"",n)})),Object.values(this.paths).concat(this.units)},animateElements:function(t){var e=t.xPositions,i=t.yPositions,n=t.values,a=this.oldData.xPositions,s=this.oldData.yPositions,r=this.oldData.values,o=y(a,e),l=Vt(o,2);a=l[0],e=l[1];var u=y(s,i),h=Vt(u,2);s=h[0],i=h[1];var c=y(r,n),d=Vt(c,2);r=d[0],n=d[1],this.render({xPositions:a,yPositions:s,values:n,zeroLine:this.oldData.zeroLine,radius:this.oldData.radius});var p=[];return Object.keys(this.paths).length&&(p=p.concat(at(this.paths,e,i,t.zeroLine,this.constants.spline))),this.units.length&&this.units.map(function(t,n){p=p.concat(nt(t,e[n],i[n]));}),p}}},Me=function(t){function i(t,e){Ft(this,i);var n=Bt(this,(i.__proto__||Object.getPrototypeOf(i)).call(this,t,e));return n.type="percentage",n.setup(),n}return Yt(i,t),It(i,[{key:"setMeasures",value:function(t){var e=this.measures;this.barOptions=t.barOptions||{};var i=this.barOptions;i.height=i.height||20,i.depth=i.depth||Jt,e.paddings.right=30,e.legendHeight=60,e.baseHeight=8*(i.height+.5*i.depth);}},{key:"setupComponents",value:function(){var t=this.state,e=[["percentageBars",{barHeight:this.barOptions.height,barDepth:this.barOptions.depth},function(){return {xPositions:t.xPositions,widths:t.widths,colors:this.colors}}.bind(this)]];this.components=new Map(e.map(function(t){var e=wt.apply(void 0,Ut(t));return [t[0],e]}));}},{key:"calc",value:function(){var t=this;Rt(i.prototype.__proto__||Object.getPrototypeOf(i.prototype),"calc",this).call(this);var e=this.state;e.xPositions=[],e.widths=[];var n=0;e.sliceTotals.map(function(i){var a=t.width*i/e.grandTotal;e.widths.push(a),e.xPositions.push(n),n+=a;});}},{key:"makeDataByIndex",value:function(){}},{key:"bindTooltip",value:function(){var t=this,i=this.state;this.container.addEventListener("mousemove",function(n){var a=t.components.get("percentageBars").store,s=n.target;if(a.includes(s)){var r=a.indexOf(s),o=e(t.container),l=e(s),u=l.left-o.left+parseInt(s.getAttribute("width"))/2,h=l.top-o.top,c=(t.formattedLabels&&t.formattedLabels.length>0?t.formattedLabels[r]:t.state.labels[r])+": ",d=i.sliceTotals[r]/i.grandTotal;t.tip.setValues(u,h,{name:c,value:(100*d).toFixed(1)+"%"}),t.tip.showTip();}});}}]),i}(be),Ce=function(t){function i(t,e){Ft(this,i);var n=Bt(this,(i.__proto__||Object.getPrototypeOf(i)).call(this,t,e));return n.type="pie",n.initTimeout=0,n.init=1,n.setup(),n}return Yt(i,t),It(i,[{key:"configure",value:function(t){Rt(i.prototype.__proto__||Object.getPrototypeOf(i.prototype),"configure",this).call(this,t),this.mouseMove=this.mouseMove.bind(this),this.mouseLeave=this.mouseLeave.bind(this),this.hoverRadio=t.hoverRadio||.1,this.config.startAngle=t.startAngle||0,this.clockWise=t.clockWise||!1;}},{key:"calc",value:function(){var t=this;Rt(i.prototype.__proto__||Object.getPrototypeOf(i.prototype),"calc",this).call(this);var e=this.state;this.radius=this.height>this.width?this.center.x:this.center.y;var n=this.radius,a=this.clockWise,s=e.slicesProperties||[];e.sliceStrings=[],e.slicesProperties=[];var r=180-this.config.startAngle;e.sliceTotals.map(function(i,o){var l=r,u=i/e.grandTotal*360,h=u>180?1:0,c=a?-u:u,d=r+=c,f=p(l,n),v=p(d,n),g=t.init&&s[o],m=void 0,y=void 0;t.init?(m=g?g.startPosition:f,y=g?g.endPosition:f):(m=f,y=v);var b=360===u?_(m,y,t.center,t.radius,a,h):E(m,y,t.center,t.radius,a,h);e.sliceStrings.push(b),e.slicesProperties.push({startPosition:f,endPosition:v,value:i,total:e.grandTotal,startAngle:l,endAngle:d,angle:c});}),this.init=0;}},{key:"setupComponents",value:function(){var t=this.state,e=[["pieSlices",{},function(){return {sliceStrings:t.sliceStrings,colors:this.colors}}.bind(this)]];this.components=new Map(e.map(function(t){var e=wt.apply(void 0,Ut(t));return [t[0],e]}));}},{key:"calTranslateByAngle",value:function(t){var e=this.radius,i=this.hoverRadio,n=p(t.startAngle+t.angle/2,e);return "translate3d("+n.x*i+"px,"+n.y*i+"px,0)"}},{key:"hoverSlice",value:function(t,i,n,a){if(t){var s=this.colors[i];if(n){ot(t,this.calTranslateByAngle(this.state.slicesProperties[i])),t.style.fill=A(s,50);var r=e(this.svg),o=a.pageX-r.left+10,l=a.pageY-r.top-10,u=(this.formatted_labels&&this.formatted_labels.length>0?this.formatted_labels[i]:this.state.labels[i])+": ",h=(100*this.state.sliceTotals[i]/this.state.grandTotal).toFixed(1);this.tip.setValues(o,l,{name:u,value:h+"%"}),this.tip.showTip();}else ot(t,"translate3d(0,0,0)"),this.tip.hideTip(),t.style.fill=s;}}},{key:"bindTooltip",value:function(){this.container.addEventListener("mousemove",this.mouseMove),this.container.addEventListener("mouseleave",this.mouseLeave);}},{key:"mouseMove",value:function(t){var e=t.target,i=this.components.get("pieSlices").store,n=this.curActiveSliceIndex,a=this.curActiveSlice;if(i.includes(e)){var s=i.indexOf(e);this.hoverSlice(a,n,!1),this.curActiveSlice=e,this.curActiveSliceIndex=s,this.hoverSlice(e,s,!0,t);}else this.mouseLeave();}},{key:"mouseLeave",value:function(){this.hoverSlice(this.curActiveSlice,this.curActiveSliceIndex,!1);}}]),i}(be),Oe=function(t){function e(t,i){Ft(this,e);var n=Bt(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,t,i));n.type="heatmap",n.countLabel=i.countLabel||"";var a=["Sunday","Monday"],s=a.includes(i.startSubDomain)?i.startSubDomain:"Sunday";return n.startSubDomainIndex=a.indexOf(s),n.setup(),n}return Yt(e,t),It(e,[{key:"setMeasures",value:function(t){var e=this.measures;this.discreteDomains=0===t.discreteDomains?0:1,e.paddings.top=36,e.paddings.bottom=0,e.legendHeight=24,e.baseHeight=12*xe+l(e);var i=this.data,n=this.discreteDomains?12:0;this.independentWidth=12*(vt(i.start,i.end)+n)+u(e);}},{key:"updateWidth",value:function(){var t=this.discreteDomains?12:0,e=this.state.noOfWeeks?this.state.noOfWeeks:52;this.baseWidth=12*(e+t)+u(this.measures);}},{key:"prepareData",value:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:this.data;if(t.start&&t.end&&t.start>t.end)throw new Error("Start date cannot be greater than end date.");if(t.start||(t.start=new Date,t.start.setFullYear(t.start.getFullYear()-1)),t.end||(t.end=new Date),t.dataPoints=t.dataPoints||{},parseInt(Object.keys(t.dataPoints)[0])>1e5){var e={};Object.keys(t.dataPoints).forEach(function(i){var n=new Date(i*ke);e[pt(n)]=t.dataPoints[i];}),t.dataPoints=e;}return t}},{key:"calc",value:function(){var t=this.state;t.start=ft(this.data.start),t.end=ft(this.data.end),t.firstWeekStart=ft(t.start),t.noOfWeeks=vt(t.start,t.end),t.distribution=St(Object.values(this.data.dataPoints),5),t.domainConfigs=this.getDomains();}},{key:"setupComponents",value:function(){var t=this,e=this.state,i=this.discreteDomains?0:1,n=e.domainConfigs.map(function(n,a){return ["heatDomain",{index:n.index,colWidth:12,rowHeight:12,squareSize:10,radius:t.rawChartArgs.radius||0,xTranslate:12*e.domainConfigs.filter(function(t,e){return e<a}).map(function(t){return t.cols.length-i}).reduce(function(t,e){return t+e},0)},function(){return e.domainConfigs[a]}.bind(t)]});this.components=new Map(n.map(function(t,e){var i=wt.apply(void 0,Ut(t));return [t[0]+"-"+e,i]}));var a=0;Pe.forEach(function(e,i){if([1,3,5].includes(i)){var n=Y("subdomain-name",-6,a,e,{fontSize:10,dy:8,textAnchor:"end"});t.drawArea.appendChild(n);}a+=12;});}},{key:"update",value:function(t){t||console.error("No data to update."),this.data=this.prepareData(t),this.draw(),this.bindTooltip();}},{key:"bindTooltip",value:function(){var t=this;this.container.addEventListener("mousemove",function(e){t.components.forEach(function(i){var n=i.store,a=e.target;if(n.includes(a)){var s=a.getAttribute("data-value"),r=a.getAttribute("data-date").split("-"),o=yt(parseInt(r[1])-1,!0),l=t.container.getBoundingClientRect(),u=a.getBoundingClientRect(),h=parseInt(e.target.getAttribute("width")),c=u.left-l.left+h/2,d=u.top-l.top,p=s+" "+t.countLabel,f=" on "+o+" "+r[0]+", "+r[2];t.tip.setValues(c,d,{name:f,value:p,valueFirst:1},[]),t.tip.showTip();}});});}},{key:"renderLegend",value:function(){var t=this;this.legendArea.textContent="";var e=0,i=this.rawChartArgs.radius||0,n=Y("subdomain-name",e,12,"Less",{fontSize:11,dy:9});e=30,this.legendArea.appendChild(n),this.colors.slice(0,5).map(function(n,a){var s=F("heatmap-legend-unit",e+15*a,12,10,i,n);t.legendArea.appendChild(s);});var a=Y("subdomain-name",e+75+3,12,"More",{fontSize:11,dy:9});this.legendArea.appendChild(a);}},{key:"getDomains",value:function(){for(var t=this.state,e=[t.start.getMonth(),t.start.getFullYear()],i=e[0],n=e[1],a=[t.end.getMonth(),t.end.getFullYear()],s=a[0]-i+1+12*(a[1]-n),r=[],o=ft(t.start),l=0;l<s;l++){var u=t.end;if(!mt(o,t.end)){var h=[o.getMonth(),o.getFullYear()];u=bt(h[0],h[1]);}r.push(this.getDomainConfig(o,u)),kt(u,1),o=u;}return r}},{key:"getDomainConfig",value:function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"",i=[t.getMonth(),t.getFullYear()],n=i[0],a=i[1],s=xt(t),r={index:n,cols:[]};kt(e=ft(e)||bt(n,a),1);for(var o=vt(s,e),l=[],u=void 0,h=0;h<o;h++)u=this.getCol(s,n),l.push(u),kt(s=new Date(u[xe-1].yyyyMmDd),1);return void 0!==u[xe-1].dataValue&&(kt(s,1),l.push(this.getCol(s,n,!0))),r.cols=l,r}},{key:"getCol",value:function(t,e){for(var i=arguments.length>2&&void 0!==arguments[2]&&arguments[2],n=this.state,a=ft(t),s=[],r=0;r<xe;r++,kt(a,1)){var o={},l=a>=n.start&&a<=n.end;i||a.getMonth()!==e||!l?o.yyyyMmDd=pt(a):o=this.getSubDomainConfig(a),s.push(o);}return s}},{key:"getSubDomainConfig",value:function(t){var e=pt(t),i=this.data.dataPoints[e];return {yyyyMmDd:e,dataValue:i||0,fill:this.colors[Et(i,this.state.distribution)]}}}]),e}(ye),De=function(t){function i(t,e){Ft(this,i);var n=Bt(this,(i.__proto__||Object.getPrototypeOf(i)).call(this,t,e));return n.barOptions=e.barOptions||{},n.lineOptions=e.lineOptions||{},n.type=e.type||"line",n.init=1,n.setup(),n}return Yt(i,t),It(i,[{key:"setMeasures",value:function(){this.data.datasets.length<=1&&(this.config.showLegend=0,this.measures.paddings.bottom=30);}},{key:"configure",value:function(t){Rt(i.prototype.__proto__||Object.getPrototypeOf(i.prototype),"configure",this).call(this,t),t.axisOptions=t.axisOptions||{},t.tooltipOptions=t.tooltipOptions||{},this.config.xAxisMode=t.axisOptions.xAxisMode||"span",this.config.yAxisMode=t.axisOptions.yAxisMode||"span",this.config.xIsSeries=t.axisOptions.xIsSeries||0,this.config.shortenYAxisNumbers=t.axisOptions.shortenYAxisNumbers||0,this.config.formatTooltipX=t.tooltipOptions.formatTooltipX,this.config.formatTooltipY=t.tooltipOptions.formatTooltipY,this.config.valuesOverPoints=t.valuesOverPoints;}},{key:"prepareData",value:function(){return _t(arguments.length>0&&void 0!==arguments[0]?arguments[0]:this.data,this.type)}},{key:"prepareFirstData",value:function(){return zt(arguments.length>0&&void 0!==arguments[0]?arguments[0]:this.data)}},{key:"calc",value:function(){var t=arguments.length>0&&void 0!==arguments[0]&&arguments[0];this.calcXPositions(),t||this.calcYAxisParameters(this.getAllYValues(),"line"===this.type),this.makeDataByIndex();}},{key:"calcXPositions",value:function(){var t=this.state,e=this.data.labels;t.datasetLength=e.length,t.unitWidth=this.width/t.datasetLength,t.xOffset=t.unitWidth/2,t.xAxis={labels:e,positions:e.map(function(e,i){return h(t.xOffset+i*t.unitWidth)})};}},{key:"calcYAxisParameters",value:function(t){var e=Lt(t,arguments.length>1&&void 0!==arguments[1]?arguments[1]:"false"),i=this.height/Ot(e),n=Ct(e)*i,a=this.height-Mt(e)*n;this.state.yAxis={labels:e,positions:e.map(function(t){return a-t*i}),scaleMultiplier:i,zeroLine:a},this.calcDatasetPoints(),this.calcYExtremes(),this.calcYRegions();}},{key:"calcDatasetPoints",value:function(){var t=this.state,e=function(e){return e.map(function(e){return Dt(e,t.yAxis)})};t.datasets=this.data.datasets.map(function(t,i){var n=t.values,a=t.cumulativeYs||[];return {name:t.name&&t.name.replace(/<|>|&/g,function(t){return "&"==t?"&amp;":"<"==t?"&lt;":"&gt;"}),index:i,chartType:t.chartType,values:n,yPositions:e(n),cumulativeYs:a,cumulativeYPos:e(a)}});}},{key:"calcYExtremes",value:function(){var t=this.state;if(this.barOptions.stacked)return void(t.yExtremes=t.datasets[t.datasets.length-1].cumulativeYPos);t.yExtremes=new Array(t.datasetLength).fill(9999),t.datasets.map(function(e){e.yPositions.map(function(e,i){e<t.yExtremes[i]&&(t.yExtremes[i]=e);});});}},{key:"calcYRegions",value:function(){var t=this.state;this.data.yMarkers&&(this.state.yMarkers=this.data.yMarkers.map(function(e){return e.position=Dt(e.value,t.yAxis),e.options||(e.options={}),e})),this.data.yRegions&&(this.state.yRegions=this.data.yRegions.map(function(e){return e.startPos=Dt(e.start,t.yAxis),e.endPos=Dt(e.end,t.yAxis),e.options||(e.options={}),e}));}},{key:"getAllYValues",value:function(){var t,e=this,i="values";if(this.barOptions.stacked){i="cumulativeYs";var n=new Array(this.state.datasetLength).fill(0);this.data.datasets.map(function(t,a){var s=e.data.datasets[a].values;t[i]=n=n.map(function(t,e){return t+s[e]});});}var a=this.data.datasets.map(function(t){return t[i]});return this.data.yMarkers&&a.push(this.data.yMarkers.map(function(t){return t.value})),this.data.yRegions&&this.data.yRegions.map(function(t){a.push([t.end,t.start]);}),(t=[]).concat.apply(t,Ut(a))}},{key:"setupComponents",value:function(){var t=this,e=[["yAxis",{mode:this.config.yAxisMode,width:this.width,shortenNumbers:this.config.shortenYAxisNumbers},function(){return this.state.yAxis}.bind(this)],["xAxis",{mode:this.config.xAxisMode,height:this.height},function(){var t=this.state;return t.xAxis.calcLabels=Wt(this.width,t.xAxis.labels,this.config.xIsSeries),t.xAxis}.bind(this)],["yRegions",{width:this.width,pos:"right"},function(){return this.state.yRegions}.bind(this)]],i=this.state.datasets.filter(function(t){return "bar"===t.chartType}),n=this.state.datasets.filter(function(t){return "line"===t.chartType}),a=i.map(function(e){var n=e.index;return ["barGraph-"+e.index,{index:n,color:t.colors[n],stacked:t.barOptions.stacked,valuesOverPoints:t.config.valuesOverPoints,minHeight:0*t.height},function(){var t=this.state,e=t.datasets[n],a=this.barOptions.stacked,s=this.barOptions.spaceRatio||.5,r=t.unitWidth*(1-s),o=r/(a?1:i.length),l=t.xAxis.positions.map(function(t){return t-r/2});a||(l=l.map(function(t){return t+o*n}));var u=new Array(t.datasetLength).fill("");this.config.valuesOverPoints&&(u=a&&e.index===t.datasets.length-1?e.cumulativeYs:e.values);var h=new Array(t.datasetLength).fill(0);return a&&(h=e.yPositions.map(function(t,i){return t-e.cumulativeYPos[i]})),{xPositions:l,yPositions:e.yPositions,offsets:h,labels:u,zeroLine:t.yAxis.zeroLine,barsWidth:r,barWidth:o}}.bind(t)]}),s=n.map(function(e){var i=e.index;return ["lineGraph-"+e.index,{index:i,color:t.colors[i],svgDefs:t.svgDefs,heatline:t.lineOptions.heatline,regionFill:t.lineOptions.regionFill,spline:t.lineOptions.spline,hideDots:t.lineOptions.hideDots,hideLine:t.lineOptions.hideLine,valuesOverPoints:t.config.valuesOverPoints},function(){var t=this.state,e=t.datasets[i],n=t.yAxis.positions[0]<t.yAxis.zeroLine?t.yAxis.positions[0]:t.yAxis.zeroLine;return {xPositions:t.xAxis.positions,yPositions:e.yPositions,values:e.values,zeroLine:n,radius:this.lineOptions.dotSize||4}}.bind(t)]}),r=[["yMarkers",{width:this.width,pos:"right"},function(){return this.state.yMarkers}.bind(this)]];e=e.concat(a,s,r);var o=["yMarkers","yRegions"];this.dataUnitComponents=[],this.components=new Map(e.filter(function(e){return !o.includes(e[0])||t.state[e[0]]}).map(function(e){var i=wt.apply(void 0,Ut(e));return (e[0].includes("lineGraph")||e[0].includes("barGraph"))&&t.dataUnitComponents.push(i),[e[0],i]}));}},{key:"makeDataByIndex",value:function(){var t=this;this.dataByIndex={};var e=this.state,i=this.config.formatTooltipX,n=this.config.formatTooltipY;e.xAxis.labels.map(function(a,s){var r=t.state.datasets.map(function(e,i){var a=e.values[s];return {title:e.name,value:a,yPos:e.yPositions[s],color:t.colors[i],formatted:n?n(a):a}});t.dataByIndex[s]={label:a,formattedLabel:i?i(a):a,xPos:e.xAxis.positions[s],values:r,yExtreme:e.yExtremes[s]};});}},{key:"bindTooltip",value:function(){var t=this;this.container.addEventListener("mousemove",function(i){var n=t.measures,a=e(t.container),s=i.pageX-a.left-o(n),l=i.pageY-a.top;l<t.height+r(n)&&l>r(n)?t.mapTooltipXPosition(s):t.tip.hideTip();});}},{key:"mapTooltipXPosition",value:function(t){var e=this.state;if(e.yExtremes){var i=Nt(t,e.xAxis.positions,!0);if(i>=0){var n=this.dataByIndex[i];this.tip.setValues(n.xPos+this.tip.offset.x,n.yExtreme+this.tip.offset.y,{name:n.formattedLabel,value:""},n.values,i),this.tip.showTip();}}}},{key:"renderLegend",value:function(){var t=this,e=this.data;e.datasets.length>1&&(this.legendArea.textContent="",e.datasets.map(function(e,i){var n=I(100*i,"0",100,t.colors[i],e.name,t.config.truncateLegends);t.legendArea.appendChild(n);}));}},{key:"makeOverlay",value:function(){var t=this;if(this.init)return void(this.init=0);this.overlayGuides&&this.overlayGuides.forEach(function(t){var e=t.overlay;e.parentNode.removeChild(e);}),this.overlayGuides=this.dataUnitComponents.map(function(t){return {type:t.unitType,overlay:void 0,units:t.units}}),void 0===this.state.currentIndex&&(this.state.currentIndex=this.state.datasetLength-1),this.overlayGuides.map(function(e){var i=e.units[t.state.currentIndex];e.overlay=ue[e.type](i),t.drawArea.appendChild(e.overlay);});}},{key:"updateOverlayGuides",value:function(){this.overlayGuides&&this.overlayGuides.forEach(function(t){var e=t.overlay;e.parentNode.removeChild(e);});}},{key:"bindOverlay",value:function(){var t=this;this.parent.addEventListener("data-select",function(){t.updateOverlay();});}},{key:"bindUnits",value:function(){var t=this;this.dataUnitComponents.map(function(e){e.units.map(function(e){e.addEventListener("click",function(){var i=e.getAttribute("data-point-index");t.setCurrentDataPoint(i);});});}),this.tip.container.addEventListener("click",function(){var e=t.tip.container.getAttribute("data-point-index");t.setCurrentDataPoint(e);});}},{key:"updateOverlay",value:function(){var t=this;this.overlayGuides.map(function(e){var i=e.units[t.state.currentIndex];he[e.type](i,e.overlay);});}},{key:"onLeftArrow",value:function(){this.setCurrentDataPoint(this.state.currentIndex-1);}},{key:"onRightArrow",value:function(){this.setCurrentDataPoint(this.state.currentIndex+1);}},{key:"getDataPoint",value:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:this.state.currentIndex,e=this.state;return {index:t,label:e.xAxis.labels[t],values:e.datasets.map(function(e){return e.values[t]})}}},{key:"setCurrentDataPoint",value:function(t){var e=this.state;(t=parseInt(t))<0&&(t=0),t>=e.xAxis.labels.length&&(t=e.xAxis.labels.length-1),t!==e.currentIndex&&(e.currentIndex=t,s(this.parent,"data-select",this.getDataPoint()));}},{key:"addDataPoint",value:function(t,e){var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:this.state.datasetLength;Rt(i.prototype.__proto__||Object.getPrototypeOf(i.prototype),"addDataPoint",this).call(this,t,e,n),this.data.labels.splice(n,0,t),this.data.datasets.map(function(t,i){t.values.splice(n,0,e[i]);}),this.update(this.data);}},{key:"removeDataPoint",value:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:this.state.datasetLength-1;this.data.labels.length<=1||(Rt(i.prototype.__proto__||Object.getPrototypeOf(i.prototype),"removeDataPoint",this).call(this,t),this.data.labels.splice(t,1),this.data.datasets.map(function(e){e.values.splice(t,1);}),this.update(this.data));}},{key:"updateDataset",value:function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0;this.data.datasets[e].values=t,this.update(this.data);}},{key:"updateDatasets",value:function(t){this.data.datasets.map(function(e,i){t[i]&&(e.values=t[i]);}),this.update(this.data);}}]),i}(ye),Ne=function(t){function i(t,e){Ft(this,i);var n=Bt(this,(i.__proto__||Object.getPrototypeOf(i)).call(this,t,e));return n.type="donut",n.initTimeout=0,n.init=1,n.setup(),n}return Yt(i,t),It(i,[{key:"configure",value:function(t){Rt(i.prototype.__proto__||Object.getPrototypeOf(i.prototype),"configure",this).call(this,t),this.mouseMove=this.mouseMove.bind(this),this.mouseLeave=this.mouseLeave.bind(this),this.hoverRadio=t.hoverRadio||.1,this.config.startAngle=t.startAngle||0,this.clockWise=t.clockWise||!1,this.strokeWidth=t.strokeWidth||30;}},{key:"calc",value:function(){var t=this;Rt(i.prototype.__proto__||Object.getPrototypeOf(i.prototype),"calc",this).call(this);var e=this.state;this.radius=this.height>this.width?this.center.x-this.strokeWidth/2:this.center.y-this.strokeWidth/2;var n=this.radius,a=this.clockWise,s=e.slicesProperties||[];e.sliceStrings=[],e.slicesProperties=[];var r=180-this.config.startAngle;e.sliceTotals.map(function(i,o){var l=r,u=i/e.grandTotal*360,h=u>180?1:0,c=a?-u:u,d=r+=c,f=p(l,n),v=p(d,n),g=t.init&&s[o],m=void 0,y=void 0;t.init?(m=g?g.startPosition:f,y=g?g.endPosition:f):(m=f,y=v);var b=360===u?W(m,y,t.center,t.radius,t.clockWise,h):z(m,y,t.center,t.radius,t.clockWise,h);e.sliceStrings.push(b),e.slicesProperties.push({startPosition:f,endPosition:v,value:i,total:e.grandTotal,startAngle:l,endAngle:d,angle:c});}),this.init=0;}},{key:"setupComponents",value:function(){var t=this.state,e=[["donutSlices",{},function(){return {sliceStrings:t.sliceStrings,colors:this.colors,strokeWidth:this.strokeWidth}}.bind(this)]];this.components=new Map(e.map(function(t){var e=wt.apply(void 0,Ut(t));return [t[0],e]}));}},{key:"calTranslateByAngle",value:function(t){var e=this.radius,i=this.hoverRadio,n=p(t.startAngle+t.angle/2,e);return "translate3d("+n.x*i+"px,"+n.y*i+"px,0)"}},{key:"hoverSlice",value:function(t,i,n,a){if(t){var s=this.colors[i];if(n){ot(t,this.calTranslateByAngle(this.state.slicesProperties[i])),t.style.stroke=A(s,50);var r=e(this.svg),o=a.pageX-r.left+10,l=a.pageY-r.top-10,u=(this.formatted_labels&&this.formatted_labels.length>0?this.formatted_labels[i]:this.state.labels[i])+": ",h=(100*this.state.sliceTotals[i]/this.state.grandTotal).toFixed(1);this.tip.setValues(o,l,{name:u,value:h+"%"}),this.tip.showTip();}else ot(t,"translate3d(0,0,0)"),this.tip.hideTip(),t.style.stroke=s;}}},{key:"bindTooltip",value:function(){this.container.addEventListener("mousemove",this.mouseMove),this.container.addEventListener("mouseleave",this.mouseLeave);}},{key:"mouseMove",value:function(t){var e=t.target,i=this.components.get("donutSlices").store,n=this.curActiveSliceIndex,a=this.curActiveSlice;if(i.includes(e)){var s=i.indexOf(e);this.hoverSlice(a,n,!1),this.curActiveSlice=e,this.curActiveSliceIndex=s,this.hoverSlice(e,s,!0,t);}else this.mouseLeave();}},{key:"mouseLeave",value:function(){this.hoverSlice(this.curActiveSlice,this.curActiveSliceIndex,!1);}}]),i}(be),Se={bar:De,line:De,percentage:Me,heatmap:Oe,pie:Ce,donut:Ne},Ee=function t(e,i){return Ft(this,t),jt(i.type,e,i)},_e=Object.freeze({Chart:Ee,PercentageChart:Me,PieChart:Ce,Heatmap:Oe,AxisChart:De}),ze={};return ze.NAME="Frappe Charts",ze.VERSION="1.5.8",ze=Object.assign({},ze,_e)});
    //# sourceMappingURL=frappe-charts.min.umd.js.map
    });

    /* node_modules\svelte-frappe-charts\src\components\base.svelte generated by Svelte v3.37.0 */
    const file$3 = "node_modules\\svelte-frappe-charts\\src\\components\\base.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			add_location(div, file$3, 88, 0, 2031);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			/*div_binding*/ ctx[18](div);

    			if (!mounted) {
    				dispose = listen_dev(div, "data-select", /*data_select_handler*/ ctx[17], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*div_binding*/ ctx[18](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Base", slots, []);

    	let { data = {
    		labels: [],
    		datasets: [{ values: [] }],
    		yMarkers: {},
    		yRegions: []
    	} } = $$props;

    	let { title = "" } = $$props;
    	let { type = "line" } = $$props;
    	let { height = 300 } = $$props;
    	let { animate = true } = $$props;
    	let { axisOptions = {} } = $$props;
    	let { barOptions = {} } = $$props;
    	let { lineOptions = {} } = $$props;
    	let { tooltipOptions = {} } = $$props;
    	let { colors = [] } = $$props;
    	let { valuesOverPoints = 0 } = $$props;
    	let { isNavigable = false } = $$props;
    	let { maxSlices = 3 } = $$props;

    	/**
     *  COMPONENT
     */
    	//  The Chart returned from frappe
    	let chart = null;

    	//  DOM node for frappe to latch onto
    	let chartRef;

    	//  Helper HOF for calling a fn only if chart exists
    	function ifChartThen(fn) {
    		return function ifChart(...args) {
    			if (chart) {
    				return fn(...args);
    			}
    		};
    	}

    	const addDataPoint = ifChartThen((label, valueFromEachDataset, index) => chart.addDataPoint(label, valueFromEachDataset, index));
    	const removeDataPoint = ifChartThen(index => chart.removeDataPoint(index));
    	const exportChart = ifChartThen(() => chart.export());

    	/**
     *  Handle initializing the chart when this Svelte component mounts
     */
    	onMount(() => {
    		chart = new frappeCharts_min_umd.Chart(chartRef,
    		{
    				data,
    				title,
    				type,
    				height,
    				animate,
    				colors,
    				axisOptions,
    				barOptions,
    				lineOptions,
    				tooltipOptions,
    				valuesOverPoints,
    				isNavigable,
    				maxSlices
    			});
    	});

    	//  Update the chart when incoming data changes
    	afterUpdate(() => chart.update(data));

    	//  Mark Chart references for garbage collection when component is unmounted
    	onDestroy(() => {
    		chart = null;
    	});

    	const writable_props = [
    		"data",
    		"title",
    		"type",
    		"height",
    		"animate",
    		"axisOptions",
    		"barOptions",
    		"lineOptions",
    		"tooltipOptions",
    		"colors",
    		"valuesOverPoints",
    		"isNavigable",
    		"maxSlices"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Base> was created with unknown prop '${key}'`);
    	});

    	function data_select_handler(event) {
    		bubble($$self, event);
    	}

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			chartRef = $$value;
    			$$invalidate(0, chartRef);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    		if ("title" in $$props) $$invalidate(2, title = $$props.title);
    		if ("type" in $$props) $$invalidate(3, type = $$props.type);
    		if ("height" in $$props) $$invalidate(4, height = $$props.height);
    		if ("animate" in $$props) $$invalidate(5, animate = $$props.animate);
    		if ("axisOptions" in $$props) $$invalidate(6, axisOptions = $$props.axisOptions);
    		if ("barOptions" in $$props) $$invalidate(7, barOptions = $$props.barOptions);
    		if ("lineOptions" in $$props) $$invalidate(8, lineOptions = $$props.lineOptions);
    		if ("tooltipOptions" in $$props) $$invalidate(9, tooltipOptions = $$props.tooltipOptions);
    		if ("colors" in $$props) $$invalidate(10, colors = $$props.colors);
    		if ("valuesOverPoints" in $$props) $$invalidate(11, valuesOverPoints = $$props.valuesOverPoints);
    		if ("isNavigable" in $$props) $$invalidate(12, isNavigable = $$props.isNavigable);
    		if ("maxSlices" in $$props) $$invalidate(13, maxSlices = $$props.maxSlices);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		afterUpdate,
    		onDestroy,
    		Chart: frappeCharts_min_umd.Chart,
    		data,
    		title,
    		type,
    		height,
    		animate,
    		axisOptions,
    		barOptions,
    		lineOptions,
    		tooltipOptions,
    		colors,
    		valuesOverPoints,
    		isNavigable,
    		maxSlices,
    		chart,
    		chartRef,
    		ifChartThen,
    		addDataPoint,
    		removeDataPoint,
    		exportChart
    	});

    	$$self.$inject_state = $$props => {
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    		if ("title" in $$props) $$invalidate(2, title = $$props.title);
    		if ("type" in $$props) $$invalidate(3, type = $$props.type);
    		if ("height" in $$props) $$invalidate(4, height = $$props.height);
    		if ("animate" in $$props) $$invalidate(5, animate = $$props.animate);
    		if ("axisOptions" in $$props) $$invalidate(6, axisOptions = $$props.axisOptions);
    		if ("barOptions" in $$props) $$invalidate(7, barOptions = $$props.barOptions);
    		if ("lineOptions" in $$props) $$invalidate(8, lineOptions = $$props.lineOptions);
    		if ("tooltipOptions" in $$props) $$invalidate(9, tooltipOptions = $$props.tooltipOptions);
    		if ("colors" in $$props) $$invalidate(10, colors = $$props.colors);
    		if ("valuesOverPoints" in $$props) $$invalidate(11, valuesOverPoints = $$props.valuesOverPoints);
    		if ("isNavigable" in $$props) $$invalidate(12, isNavigable = $$props.isNavigable);
    		if ("maxSlices" in $$props) $$invalidate(13, maxSlices = $$props.maxSlices);
    		if ("chart" in $$props) chart = $$props.chart;
    		if ("chartRef" in $$props) $$invalidate(0, chartRef = $$props.chartRef);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		chartRef,
    		data,
    		title,
    		type,
    		height,
    		animate,
    		axisOptions,
    		barOptions,
    		lineOptions,
    		tooltipOptions,
    		colors,
    		valuesOverPoints,
    		isNavigable,
    		maxSlices,
    		addDataPoint,
    		removeDataPoint,
    		exportChart,
    		data_select_handler,
    		div_binding
    	];
    }

    class Base extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			data: 1,
    			title: 2,
    			type: 3,
    			height: 4,
    			animate: 5,
    			axisOptions: 6,
    			barOptions: 7,
    			lineOptions: 8,
    			tooltipOptions: 9,
    			colors: 10,
    			valuesOverPoints: 11,
    			isNavigable: 12,
    			maxSlices: 13,
    			addDataPoint: 14,
    			removeDataPoint: 15,
    			exportChart: 16
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Base",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get data() {
    		throw new Error("<Base>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<Base>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<Base>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Base>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get animate() {
    		throw new Error("<Base>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set animate(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get axisOptions() {
    		throw new Error("<Base>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set axisOptions(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get barOptions() {
    		throw new Error("<Base>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set barOptions(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lineOptions() {
    		throw new Error("<Base>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lineOptions(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tooltipOptions() {
    		throw new Error("<Base>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tooltipOptions(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get colors() {
    		throw new Error("<Base>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colors(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get valuesOverPoints() {
    		throw new Error("<Base>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valuesOverPoints(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isNavigable() {
    		throw new Error("<Base>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isNavigable(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get maxSlices() {
    		throw new Error("<Base>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set maxSlices(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get addDataPoint() {
    		return this.$$.ctx[14];
    	}

    	set addDataPoint(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get removeDataPoint() {
    		return this.$$.ctx[15];
    	}

    	set removeDataPoint(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get exportChart() {
    		return this.$$.ctx[16];
    	}

    	set exportChart(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\TopRepos.svelte generated by Svelte v3.37.0 */

    const { Object: Object_1 } = globals;
    const file$2 = "src\\components\\TopRepos.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    // (143:4) {#each top10Starred as repo}
    function create_each_block(ctx) {
    	let div4;
    	let div3;
    	let div1;
    	let p0;
    	let a;
    	let svg0;
    	let path0;
    	let t0;
    	let t1_value = /*repo*/ ctx[14].name + "";
    	let t1;
    	let t2;
    	let div0;

    	let t3_value = (/*v*/ ctx[5] = /*repo*/ ctx[14].description.length > 100
    	? /*repo*/ ctx[14].description.slice(0, 100)
    	: /*repo*/ ctx[14].description) + "";

    	let t3;
    	let t4;
    	let t5;
    	let div2;
    	let p1;
    	let t6_value = /*repo*/ ctx[14].language + "";
    	let t6;
    	let t7;
    	let p2;
    	let svg1;
    	let path1;
    	let t8;
    	let t9_value = /*repo*/ ctx[14].stargazers_count + "";
    	let t9;
    	let t10;
    	let p3;
    	let svg2;
    	let path2;
    	let t11;
    	let t12_value = /*repo*/ ctx[14].forks_count + "";
    	let t12;
    	let t13;
    	let p4;
    	let t14_value = /*repo*/ ctx[14].size + "";
    	let t14;
    	let t15;
    	let t16;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			p0 = element("p");
    			a = element("a");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			div0 = element("div");
    			t3 = text(t3_value);
    			t4 = text(" . . .");
    			t5 = space();
    			div2 = element("div");
    			p1 = element("p");
    			t6 = text(t6_value);
    			t7 = space();
    			p2 = element("p");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			t8 = space();
    			t9 = text(t9_value);
    			t10 = space();
    			p3 = element("p");
    			svg2 = svg_element("svg");
    			path2 = svg_element("path");
    			t11 = space();
    			t12 = text(t12_value);
    			t13 = space();
    			p4 = element("p");
    			t14 = text(t14_value);
    			t15 = text(" KB");
    			t16 = space();
    			attr_dev(path0, "fill-rule", "evenodd");
    			attr_dev(path0, "d", "M4 9H3V8h1v1zm0-3H3v1h1V6zm0-2H3v1h1V4zm0-2H3v1h1V2zm8-1v12c0 .55-.45 1-1 1H6v2l-1.5-1.5L3 16v-2H1c-.55 0-1-.45-1-1V1c0-.55.45-1 1-1h10c.55 0 1 .45 1 1zm-1 10H1v2h2v-1h3v1h5v-2zm0-10H2v9h9V1z");
    			add_location(path0, file$2, 156, 19, 4671);
    			attr_dev(svg0, "aria-hidden", "true");
    			attr_dev(svg0, "class", "octicon");
    			attr_dev(svg0, "height", "16");
    			attr_dev(svg0, "role", "img");
    			attr_dev(svg0, "viewBox", "0 0 12 16");
    			attr_dev(svg0, "width", "12");
    			set_style(svg0, "display", "inline-block");
    			set_style(svg0, "fill", "currentcolor");
    			set_style(svg0, "user-select", "none");
    			set_style(svg0, "vertical-align", "text-bottom");
    			add_location(svg0, file$2, 148, 17, 4325);
    			attr_dev(a, "href", /*repo*/ ctx[14].html_url);
    			add_location(a, file$2, 147, 14, 4283);
    			attr_dev(p0, "class", "has-text-weight-bold is-size-6");
    			add_location(p0, file$2, 146, 12, 4225);
    			attr_dev(div0, "class", "content");
    			add_location(div0, file$2, 164, 12, 5061);
    			attr_dev(div1, "class", "card-content svelte-1u3hpya");
    			add_location(div1, file$2, 145, 10, 4185);
    			attr_dev(p1, "class", "card-footer-item");
    			add_location(p1, file$2, 172, 12, 5337);
    			attr_dev(path1, "fill-rule", "evenodd");
    			attr_dev(path1, "d", "M14 6l-4.9-.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14 7 11.67 11.33 14l-.93-4.74L14 6z");
    			add_location(path1, file$2, 182, 17, 5772);
    			attr_dev(svg1, "aria-hidden", "true");
    			attr_dev(svg1, "class", "octicon");
    			attr_dev(svg1, "height", "16");
    			attr_dev(svg1, "role", "img");
    			attr_dev(svg1, "viewBox", "0 0 14 16");
    			attr_dev(svg1, "width", "14");
    			set_style(svg1, "display", "inline-block");
    			set_style(svg1, "fill", "currentcolor");
    			set_style(svg1, "user-select", "none");
    			set_style(svg1, "vertical-align", "text-bottom");
    			add_location(svg1, file$2, 174, 14, 5442);
    			attr_dev(p2, "class", "card-footer-item");
    			add_location(p2, file$2, 173, 12, 5398);
    			attr_dev(path2, "fill-rule", "evenodd");
    			attr_dev(path2, "d", "M8 1a1.993 1.993 0 0 0-1 3.72V6L5 8 3 6V4.72A1.993 1.993 0 0 0 2 1a1.993 1.993 0 0 0-1 3.72V6.5l3 3v1.78A1.993 1.993 0 0 0 5 15a1.993 1.993 0 0 0 1-3.72V9.5l3-3V4.72A1.993 1.993 0 0 0 8 1zM2 4.2C1.34 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3 10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3-10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z");
    			add_location(path2, file$2, 198, 17, 6408);
    			attr_dev(svg2, "aria-hidden", "true");
    			attr_dev(svg2, "class", "octicon");
    			attr_dev(svg2, "height", "16");
    			attr_dev(svg2, "role", "img");
    			attr_dev(svg2, "viewBox", "0 0 10 16");
    			attr_dev(svg2, "width", "10");
    			set_style(svg2, "display", "inline-block");
    			set_style(svg2, "fill", "currentcolor");
    			set_style(svg2, "user-select", "none");
    			set_style(svg2, "vertical-align", "text-bottom");
    			add_location(svg2, file$2, 190, 14, 6078);
    			attr_dev(p3, "class", "card-footer-item");
    			add_location(p3, file$2, 189, 12, 6034);
    			attr_dev(p4, "class", "card-footer-item");
    			add_location(p4, file$2, 205, 12, 7046);
    			attr_dev(div2, "class", "card-footer");
    			add_location(div2, file$2, 171, 10, 5298);
    			attr_dev(div3, "class", "card");
    			add_location(div3, file$2, 144, 8, 4155);
    			attr_dev(div4, "class", "column is-4");
    			add_location(div4, file$2, 143, 6, 4120);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, p0);
    			append_dev(p0, a);
    			append_dev(a, svg0);
    			append_dev(svg0, path0);
    			append_dev(a, t0);
    			append_dev(a, t1);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, t3);
    			append_dev(div0, t4);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div2, p1);
    			append_dev(p1, t6);
    			append_dev(div2, t7);
    			append_dev(div2, p2);
    			append_dev(p2, svg1);
    			append_dev(svg1, path1);
    			append_dev(p2, t8);
    			append_dev(p2, t9);
    			append_dev(div2, t10);
    			append_dev(div2, p3);
    			append_dev(p3, svg2);
    			append_dev(svg2, path2);
    			append_dev(p3, t11);
    			append_dev(p3, t12);
    			append_dev(div2, t13);
    			append_dev(div2, p4);
    			append_dev(p4, t14);
    			append_dev(p4, t15);
    			append_dev(div4, t16);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(143:4) {#each top10Starred as repo}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div18;
    	let div16;
    	let div3;
    	let div2;
    	let div1;
    	let h20;
    	let t1;
    	let div0;
    	let chart0;
    	let t2;
    	let div7;
    	let div6;
    	let div5;
    	let h21;
    	let t4;
    	let div4;
    	let chart1;
    	let t5;
    	let div11;
    	let div10;
    	let div9;
    	let h22;
    	let t7;
    	let div8;
    	let chart2;
    	let t8;
    	let div15;
    	let div14;
    	let div13;
    	let h23;
    	let t10;
    	let div12;
    	let chart3;
    	let t11;
    	let h24;
    	let t13;
    	let div17;
    	let t14;
    	let nav;
    	let div27;
    	let div23;
    	let a0;
    	let t16;
    	let div19;
    	let a1;
    	let img;
    	let img_src_value;
    	let t17;
    	let a2;
    	let span0;
    	let t18;
    	let span1;
    	let t19;
    	let span2;
    	let t20;
    	let div22;
    	let div21;
    	let div20;
    	let a3;
    	let t22;
    	let div26;
    	let div25;
    	let div24;
    	let a4;
    	let strong0;
    	let t24;
    	let a5;
    	let strong1;
    	let current;

    	chart0 = new Base({
    			props: {
    				data: /*chartData*/ ctx[2],
    				type: "percentage",
    				maxSlices: /*chartData*/ ctx[2].labels.length
    			},
    			$$inline: true
    		});

    	chart1 = new Base({
    			props: {
    				data: /*languageStarsChart*/ ctx[1],
    				type: "percentage",
    				maxSlices: /*languageStarsChart*/ ctx[1].labels.length
    			},
    			$$inline: true
    		});

    	chart2 = new Base({
    			props: {
    				data: /*topReposChart*/ ctx[3],
    				type: "pie",
    				maxSlices: /*chartData*/ ctx[2].labels.length,
    				height: 350
    			},
    			$$inline: true
    		});

    	chart3 = new Base({
    			props: {
    				data: /*topForkedChart*/ ctx[4],
    				type: "pie",
    				maxSlices: /*chartData*/ ctx[2].labels.length,
    				height: 350
    			},
    			$$inline: true
    		});

    	let each_value = /*top10Starred*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div18 = element("div");
    			div16 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			h20 = element("h2");
    			h20.textContent = "Top Languages";
    			t1 = space();
    			div0 = element("div");
    			create_component(chart0.$$.fragment);
    			t2 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Stars Per Language";
    			t4 = space();
    			div4 = element("div");
    			create_component(chart1.$$.fragment);
    			t5 = space();
    			div11 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			h22 = element("h2");
    			h22.textContent = "Most Starred Repos";
    			t7 = space();
    			div8 = element("div");
    			create_component(chart2.$$.fragment);
    			t8 = space();
    			div15 = element("div");
    			div14 = element("div");
    			div13 = element("div");
    			h23 = element("h2");
    			h23.textContent = "Most Forked Repos";
    			t10 = space();
    			div12 = element("div");
    			create_component(chart3.$$.fragment);
    			t11 = space();
    			h24 = element("h2");
    			h24.textContent = "Top Repos";
    			t13 = space();
    			div17 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t14 = space();
    			nav = element("nav");
    			div27 = element("div");
    			div23 = element("div");
    			a0 = element("a");
    			a0.textContent = "Powered By :";
    			t16 = space();
    			div19 = element("div");
    			a1 = element("a");
    			img = element("img");
    			t17 = space();
    			a2 = element("a");
    			span0 = element("span");
    			t18 = space();
    			span1 = element("span");
    			t19 = space();
    			span2 = element("span");
    			t20 = space();
    			div22 = element("div");
    			div21 = element("div");
    			div20 = element("div");
    			a3 = element("a");
    			a3.textContent = "Documentation";
    			t22 = space();
    			div26 = element("div");
    			div25 = element("div");
    			div24 = element("div");
    			a4 = element("a");
    			strong0 = element("strong");
    			strong0.textContent = "Github";
    			t24 = space();
    			a5 = element("a");
    			strong1 = element("strong");
    			strong1.textContent = "LinkedIn";
    			attr_dev(h20, "class", "card-header-title");
    			add_location(h20, file$2, 82, 10, 2367);
    			attr_dev(div0, "class", "content");
    			add_location(div0, file$2, 83, 10, 2427);
    			attr_dev(div1, "class", "card-content");
    			add_location(div1, file$2, 81, 8, 2329);
    			attr_dev(div2, "class", "card");
    			add_location(div2, file$2, 80, 6, 2301);
    			attr_dev(div3, "class", "column is-6");
    			add_location(div3, file$2, 79, 4, 2268);
    			attr_dev(h21, "class", "card-header-title");
    			add_location(h21, file$2, 96, 10, 2765);
    			attr_dev(div4, "class", "content");
    			add_location(div4, file$2, 97, 10, 2830);
    			attr_dev(div5, "class", "card-content");
    			add_location(div5, file$2, 95, 8, 2727);
    			attr_dev(div6, "class", "card");
    			add_location(div6, file$2, 94, 6, 2699);
    			attr_dev(div7, "class", "column is-6");
    			add_location(div7, file$2, 93, 4, 2666);
    			attr_dev(h22, "class", "card-header-title");
    			add_location(h22, file$2, 110, 10, 3186);
    			attr_dev(div8, "class", "content");
    			add_location(div8, file$2, 111, 10, 3251);
    			attr_dev(div9, "class", "card-content");
    			add_location(div9, file$2, 109, 8, 3148);
    			attr_dev(div10, "class", "card");
    			add_location(div10, file$2, 108, 6, 3120);
    			attr_dev(div11, "class", "column is-6");
    			add_location(div11, file$2, 107, 4, 3087);
    			attr_dev(h23, "class", "card-header-title");
    			add_location(h23, file$2, 126, 10, 3616);
    			attr_dev(div12, "class", "content");
    			add_location(div12, file$2, 127, 10, 3680);
    			attr_dev(div13, "class", "card-content");
    			add_location(div13, file$2, 125, 8, 3578);
    			attr_dev(div14, "class", "card");
    			add_location(div14, file$2, 124, 6, 3550);
    			attr_dev(div15, "class", "column is-6");
    			add_location(div15, file$2, 123, 4, 3517);
    			attr_dev(div16, "class", "charts columns is-multiline");
    			add_location(div16, file$2, 78, 2, 2221);
    			attr_dev(h24, "class", "title has-text-white");
    			set_style(h24, "text-align", "center");
    			add_location(h24, file$2, 140, 2, 3955);
    			attr_dev(div17, "class", "top-repos columns is-multiline svelte-1u3hpya");
    			add_location(div17, file$2, 141, 2, 4034);
    			attr_dev(div18, "class", "container pt-4");
    			add_location(div18, file$2, 77, 0, 2189);
    			attr_dev(a0, "class", "navbar-item");
    			attr_dev(a0, "href", "https://bulma.io/");
    			add_location(a0, file$2, 216, 6, 7340);
    			if (img.src !== (img_src_value = "https://bulma.io/images/bulma-logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", "112");
    			attr_dev(img, "height", "28");
    			attr_dev(img, "alt", "logo");
    			add_location(img, file$2, 220, 10, 7511);
    			attr_dev(a1, "class", "navbar-item");
    			attr_dev(a1, "href", "https://bulma.io");
    			add_location(a1, file$2, 219, 8, 7452);
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$2, 236, 10, 7912);
    			attr_dev(span1, "aria-hidden", "true");
    			add_location(span1, file$2, 237, 10, 7951);
    			attr_dev(span2, "aria-hidden", "true");
    			add_location(span2, file$2, 238, 10, 7990);
    			attr_dev(a2, "role", "button");
    			attr_dev(a2, "href", "https://bulma.io/");
    			attr_dev(a2, "class", "navbar-burger");
    			attr_dev(a2, "aria-label", "menu");
    			attr_dev(a2, "aria-expanded", "false");
    			attr_dev(a2, "data-target", "navbarBasicExample");
    			add_location(a2, file$2, 228, 8, 7687);
    			attr_dev(div19, "class", "navbar-brand");
    			add_location(div19, file$2, 218, 6, 7416);
    			attr_dev(a3, "class", "button is-light");
    			attr_dev(a3, "href", "https://bulma.io/");
    			add_location(a3, file$2, 245, 12, 8161);
    			attr_dev(div20, "class", "buttons");
    			add_location(div20, file$2, 244, 10, 8126);
    			attr_dev(div21, "class", "navbar-item");
    			add_location(div21, file$2, 243, 8, 8089);
    			attr_dev(div22, "class", "navbar-end");
    			add_location(div22, file$2, 242, 6, 8055);
    			attr_dev(div23, "class", "navbar-start");
    			add_location(div23, file$2, 215, 4, 7306);
    			add_location(strong0, file$2, 261, 12, 8576);
    			attr_dev(a4, "href", "https://github.com/Ansh-Sarkar");
    			attr_dev(a4, "class", "button is-primary");
    			attr_dev(a4, "target", "_blank");
    			add_location(a4, file$2, 256, 10, 8428);
    			add_location(strong1, file$2, 268, 12, 8785);
    			attr_dev(a5, "href", "https://www.linkedin.com/in/ansh-sarkar/");
    			attr_dev(a5, "class", "button is-primary");
    			attr_dev(a5, "target", "_blank");
    			add_location(a5, file$2, 263, 10, 8627);
    			attr_dev(div24, "class", "buttons");
    			add_location(div24, file$2, 255, 8, 8395);
    			attr_dev(div25, "class", "navbar-item");
    			add_location(div25, file$2, 254, 6, 8360);
    			attr_dev(div26, "class", "navbar-end");
    			add_location(div26, file$2, 253, 4, 8328);
    			attr_dev(div27, "id", "navbarBasicExample");
    			attr_dev(div27, "class", "navbar-menu");
    			add_location(div27, file$2, 214, 2, 7251);
    			attr_dev(nav, "class", "navbar mt-5");
    			attr_dev(nav, "role", "navigation");
    			attr_dev(nav, "aria-label", "main navigation");
    			add_location(nav, file$2, 213, 0, 7175);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div18, anchor);
    			append_dev(div18, div16);
    			append_dev(div16, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h20);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			mount_component(chart0, div0, null);
    			append_dev(div16, t2);
    			append_dev(div16, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, h21);
    			append_dev(div5, t4);
    			append_dev(div5, div4);
    			mount_component(chart1, div4, null);
    			append_dev(div16, t5);
    			append_dev(div16, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, h22);
    			append_dev(div9, t7);
    			append_dev(div9, div8);
    			mount_component(chart2, div8, null);
    			append_dev(div16, t8);
    			append_dev(div16, div15);
    			append_dev(div15, div14);
    			append_dev(div14, div13);
    			append_dev(div13, h23);
    			append_dev(div13, t10);
    			append_dev(div13, div12);
    			mount_component(chart3, div12, null);
    			append_dev(div18, t11);
    			append_dev(div18, h24);
    			append_dev(div18, t13);
    			append_dev(div18, div17);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div17, null);
    			}

    			insert_dev(target, t14, anchor);
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div27);
    			append_dev(div27, div23);
    			append_dev(div23, a0);
    			append_dev(div23, t16);
    			append_dev(div23, div19);
    			append_dev(div19, a1);
    			append_dev(a1, img);
    			append_dev(div19, t17);
    			append_dev(div19, a2);
    			append_dev(a2, span0);
    			append_dev(a2, t18);
    			append_dev(a2, span1);
    			append_dev(a2, t19);
    			append_dev(a2, span2);
    			append_dev(div23, t20);
    			append_dev(div23, div22);
    			append_dev(div22, div21);
    			append_dev(div21, div20);
    			append_dev(div20, a3);
    			append_dev(div27, t22);
    			append_dev(div27, div26);
    			append_dev(div26, div25);
    			append_dev(div25, div24);
    			append_dev(div24, a4);
    			append_dev(a4, strong0);
    			append_dev(div24, t24);
    			append_dev(div24, a5);
    			append_dev(a5, strong1);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*top10Starred, v*/ 33) {
    				each_value = /*top10Starred*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div17, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(chart0.$$.fragment, local);
    			transition_in(chart1.$$.fragment, local);
    			transition_in(chart2.$$.fragment, local);
    			transition_in(chart3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(chart0.$$.fragment, local);
    			transition_out(chart1.$$.fragment, local);
    			transition_out(chart2.$$.fragment, local);
    			transition_out(chart3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div18);
    			destroy_component(chart0);
    			destroy_component(chart1);
    			destroy_component(chart2);
    			destroy_component(chart3);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(nav);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("TopRepos", slots, []);
    	let { repos } = $$props;
    	let myrepos = [];

    	if (repos.length > 0) {
    		// output only those repos which were original
    		// made by that user
    		myrepos = repos.filter(r => !r.fork);
    	}

    	let sortedByForks = [...myrepos].sort((a, b) => {
    		if (a.forks_count > b.forks_count) return -1; else if (a.forks_count < b.forks_count) return 1;
    		return 0;
    	});

    	let top10forked = sortedByForks.splice(0, 9);

    	let sortedByStars = [...myrepos].sort((a, b) => {
    		if (a.stargazers_count > b.stargazers_count) return -1; else if (a.stargazers_count < b.stargazers_count) return 1;
    		return 0;
    	});

    	let top10Starred = sortedByStars.splice(0, 9);
    	let languages = {};
    	let languageStars = {};

    	for (const repo of sortedByStars) {
    		languages[repo.language] = languages[repo.language] || 0;
    		++languages[repo.language];
    		languageStars[repo.language] = languageStars[repo.language] || 0;
    		languageStars[repo.language] += repo.stargazers_count;
    	}

    	if (languages["null"]) {
    		languages.Others = languages["null"];
    		delete languages["null"];
    	}

    	if (languageStars["null"]) {
    		languageStars.Others = languageStars["null"];
    		delete languageStars["null"];
    	}

    	let languageStarsChart = {
    		labels: Object.keys(languageStars),
    		datasets: [{ values: Object.values(languageStars) }]
    	};

    	let chartData = {
    		labels: Object.keys(languages),
    		datasets: [{ values: Object.values(languages) }]
    	};

    	let topReposChart = {
    		labels: top10Starred.map(repo => repo.name),
    		datasets: [
    			{
    				values: top10Starred.map(repo => repo.stargazers_count)
    			}
    		]
    	};

    	const topForkedChart = {
    		labels: top10forked.map(repo => repo.name),
    		datasets: [
    			{
    				values: top10forked.map(repo => repo.forks_count)
    			}
    		]
    	};

    	const sliced_description = str => {
    		if (str.length > 100) return str.splice(0, 100); else return str;
    	};

    	let v = "";
    	const writable_props = ["repos"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TopRepos> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("repos" in $$props) $$invalidate(6, repos = $$props.repos);
    	};

    	$$self.$capture_state = () => ({
    		Chart: Base,
    		GithubIcon,
    		repos,
    		myrepos,
    		sortedByForks,
    		top10forked,
    		sortedByStars,
    		top10Starred,
    		languages,
    		languageStars,
    		languageStarsChart,
    		chartData,
    		topReposChart,
    		topForkedChart,
    		sliced_description,
    		v
    	});

    	$$self.$inject_state = $$props => {
    		if ("repos" in $$props) $$invalidate(6, repos = $$props.repos);
    		if ("myrepos" in $$props) myrepos = $$props.myrepos;
    		if ("sortedByForks" in $$props) sortedByForks = $$props.sortedByForks;
    		if ("top10forked" in $$props) top10forked = $$props.top10forked;
    		if ("sortedByStars" in $$props) sortedByStars = $$props.sortedByStars;
    		if ("top10Starred" in $$props) $$invalidate(0, top10Starred = $$props.top10Starred);
    		if ("languages" in $$props) languages = $$props.languages;
    		if ("languageStars" in $$props) languageStars = $$props.languageStars;
    		if ("languageStarsChart" in $$props) $$invalidate(1, languageStarsChart = $$props.languageStarsChart);
    		if ("chartData" in $$props) $$invalidate(2, chartData = $$props.chartData);
    		if ("topReposChart" in $$props) $$invalidate(3, topReposChart = $$props.topReposChart);
    		if ("v" in $$props) $$invalidate(5, v = $$props.v);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		top10Starred,
    		languageStarsChart,
    		chartData,
    		topReposChart,
    		topForkedChart,
    		v,
    		repos
    	];
    }

    class TopRepos extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { repos: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TopRepos",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*repos*/ ctx[6] === undefined && !("repos" in props)) {
    			console.warn("<TopRepos> was created without expected prop 'repos'");
    		}
    	}

    	get repos() {
    		throw new Error("<TopRepos>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set repos(value) {
    		throw new Error("<TopRepos>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\routes\UserStats.svelte generated by Svelte v3.37.0 */
    const file$1 = "src\\routes\\UserStats.svelte";

    function get_then_context(ctx) {
    	ctx[3] = ctx[6].user;
    	ctx[4] = ctx[6].repos;
    	ctx[5] = ctx[6].headers;
    }

    // (1:0) <script>    export let params = {}
    function create_catch_block(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script>    export let params = {}",
    		ctx
    	});

    	return block;
    }

    // (18:2) {:then { user, repos, headers }}
    function create_then_block(ctx) {
    	get_then_context(ctx);
    	let div;
    	let t0_value = /*headers*/ ctx[5]["x-ratelimit-remaining"] + "";
    	let t0;
    	let t1;
    	let t2_value = /*headers*/ ctx[5]["x-ratelimit-limit"] + "";
    	let t2;
    	let t3;
    	let br;
    	let t4;
    	let span;
    	let t6;
    	let profile;
    	let t7;
    	let toprepos;
    	let current;

    	profile = new Profile({
    			props: { user: /*user*/ ctx[3] },
    			$$inline: true
    		});

    	toprepos = new TopRepos({
    			props: { repos: /*repos*/ ctx[4] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = text(" / ");
    			t2 = text(t2_value);
    			t3 = space();
    			br = element("br");
    			t4 = space();
    			span = element("span");
    			span.textContent = "Requests Left";
    			t6 = space();
    			create_component(profile.$$.fragment);
    			t7 = space();
    			create_component(toprepos.$$.fragment);
    			add_location(br, file$1, 20, 6, 782);
    			attr_dev(span, "class", "small svelte-1y6vmwf");
    			add_location(span, file$1, 21, 6, 796);
    			attr_dev(div, "class", "limits has-text-light has-text-weight-bold subtitle svelte-1y6vmwf");
    			add_location(div, file$1, 18, 4, 634);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    			append_dev(div, t3);
    			append_dev(div, br);
    			append_dev(div, t4);
    			append_dev(div, span);
    			insert_dev(target, t6, anchor);
    			mount_component(profile, target, anchor);
    			insert_dev(target, t7, anchor);
    			mount_component(toprepos, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			get_then_context(ctx);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(profile.$$.fragment, local);
    			transition_in(toprepos.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(profile.$$.fragment, local);
    			transition_out(toprepos.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t6);
    			destroy_component(profile, detaching);
    			if (detaching) detach_dev(t7);
    			destroy_component(toprepos, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(18:2) {:then { user, repos, headers }}",
    		ctx
    	});

    	return block;
    }

    // (14:14)       <div class="loading">        <progress class="progress is-small is-primary" max="100" />      </div>    {:then { user, repos, headers }}
    function create_pending_block(ctx) {
    	let div;
    	let progress;

    	const block = {
    		c: function create() {
    			div = element("div");
    			progress = element("progress");
    			attr_dev(progress, "class", "progress is-small is-primary svelte-1y6vmwf");
    			attr_dev(progress, "max", "100");
    			add_location(progress, file$1, 15, 6, 521);
    			attr_dev(div, "class", "loading svelte-1y6vmwf");
    			add_location(div, file$1, 14, 4, 492);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, progress);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(14:14)       <div class=\\\"loading\\\">        <progress class=\\\"progress is-small is-primary\\\" max=\\\"100\\\" />      </div>    {:then { user, repos, headers }}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let main;
    	let div;
    	let t0;
    	let button;
    	let t2;
    	let current;
    	let mounted;
    	let dispose;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 6,
    		blocks: [,,,]
    	};

    	handle_promise(/*res*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			t0 = space();
    			button = element("button");
    			button.textContent = "Back";
    			t2 = space();
    			info.block.c();
    			attr_dev(div, "class", "bg svelte-1y6vmwf");
    			add_location(div, file$1, 11, 2, 372);
    			attr_dev(button, "class", "back-button button is-primary svelte-1y6vmwf");
    			add_location(button, file$1, 12, 2, 394);
    			add_location(main, file$1, 10, 0, 362);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			append_dev(main, t0);
    			append_dev(main, button);
    			append_dev(main, t2);
    			info.block.m(main, info.anchor = null);
    			info.mount = () => main;
    			info.anchor = null;
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", pop, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			{
    				const child_ctx = ctx.slice();
    				child_ctx[6] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			info.block.d();
    			info.token = null;
    			info = null;
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("UserStats", slots, []);
    	let { params = {} } = $$props;
    	const username = params.username;
    	let res = getUserStats(username);
    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<UserStats> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("params" in $$props) $$invalidate(1, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		params,
    		getAllRepos,
    		getUser,
    		getUserStats,
    		Profile,
    		TopRepos,
    		pop,
    		username,
    		res
    	});

    	$$self.$inject_state = $$props => {
    		if ("params" in $$props) $$invalidate(1, params = $$props.params);
    		if ("res" in $$props) $$invalidate(0, res = $$props.res);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [res, params];
    }

    class UserStats extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { params: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "UserStats",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get params() {
    		throw new Error("<UserStats>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<UserStats>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const routes = {
        '/': Home,
        '/users/:username': UserStats,
    };

    /* src\App.svelte generated by Svelte v3.37.0 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let router;
    	let current;
    	router = new Router({ props: { routes }, $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(router.$$.fragment);
    			add_location(main, file, 5, 0, 98);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(router, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(router);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Router, routes });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'Ansh'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map

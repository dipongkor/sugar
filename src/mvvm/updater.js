/**
 * updater 视图刷新模块
 */
define([
	'../dom',
	'../util'
], function(dom, util) {

	function Updater(vm) {
		this.vm = vm;
		// 事件绑定回调集合
		this.$listeners = {};
	}

	var up = Updater.prototype;

	/**
	 * 更新节点的文本内容 realize v-text
	 * @param   {DOMElement}  node
	 * @param   {String}      text
	 */
	up.updateTextContent = function(node, text) {
		node.textContent = String(text);
	}

	/**
	 * 更新节点的 html 内容 realize v-html
	 * 处理 {{{html}}} 指令时 node 为文本的父节点
	 * @param   {DOMElement}  node
	 * @param   {String}      html
	 */
	up.updateHtmlContent = function(node, html) {
		dom.empty(node).appendChild(util.stringToFragment(String(html)));
	}

	/**
	 * 更新节点的显示隐藏 realize v-show/v-else
	 * @param   {DOMElement}  node
	 * @param   {Boolean}     show    [是否显示]
	 */
	up.updateDisplay = function(node, show) {
		var siblingNode = this.getSibling(node);

		this.setVisible(node);
		this.updateStyle(node, 'display', show ? node._visible_display : 'none');

		// v-else
		if (siblingNode && (dom.hasAttr(siblingNode, 'v-else') || siblingNode._directive === 'v-else')) {
			this.setVisible(siblingNode);
			this.updateStyle(siblingNode, 'display', show ? 'none' : siblingNode._visible_display);
		}
	}

	/**
	 * 缓存节点行内样式值
	 * 行内样式 display='' 不会影响由 classname 中的定义
	 * _visible_display 用于缓存节点行内样式的 display 显示值
	 * @param  {DOMElement}  node
	 */
	up.setVisible = function(node) {
		var inlineStyle, styles, display;

		if (!node._visible_display) {
			inlineStyle = util.removeSpace(dom.getAttr(node, 'style'));

			if (inlineStyle && inlineStyle.indexOf('display') !== -1) {
				styles = inlineStyle.split(';');

				util.each(styles, function(style) {
					if (style.indexOf('display') !== -1) {
						display = util.getKeyValue(style);
					}
				});
			}

			if (display !== 'none') {
				node._visible_display = display || '';
			}
		}
	}

	/**
	 * 更新节点内容的渲染 realize v-if/v-else
	 * @param   {DOMElement}  node
	 * @param   {Boolean}     isRender  [是否渲染]
	 */
	up.updateRenderContent = function(node, isRender) {
		var siblingNode = this.getSibling(node);

		this.setRender(node);
		this.toggleRender.apply(this, arguments);

		// v-else
		if (siblingNode && (dom.hasAttr(siblingNode, 'v-else') || siblingNode._directive === 'v-else')) {
			this.setRender(siblingNode);
			this.toggleRender(siblingNode, !isRender);
		}
	}

	/**
	 * 缓存节点渲染内容并清空
	 */
	up.setRender = function(node) {
		if (!node._render_content) {
			node._render_content = node.innerHTML;
		}
		dom.empty(node);
	}

	/**
	 * 切换节点内容渲染
	 */
	up.toggleRender = function(node, isRender) {
		var fragment;
		// 渲染
		if (isRender) {
			fragment = util.stringToFragment(node._render_content);
			this.vm.complieElement(fragment, true);
			node.appendChild(fragment);
		}
	}

	/**
	 * 获取节点的下一个兄弟元素节点
	 */
	up.getSibling = function(node) {
		var el = node.nextSibling;
		var isElementNode = this.vm.isElementNode;

		if (el && isElementNode(el)) {
			return el;
		}

		while (el) {
			el = el.nextSibling;

			if (el && isElementNode(el)) {
				return el;
			}
		}

		return null;
	}

	/**
	 * 更新节点的 attribute realize v-bind
	 * @param   {DOMElement}  node
	 * @param   {String}      attribute
	 * @param   {String}      value
	 */
	up.updateAttribute = function(node, attribute, value) {
		if (value === null) {
			dom.removeAttr.apply(this, arguments);
		}
		else {
			// setAttribute 不适合用于表单元素的 value
			// https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute
			if (attribute === 'value' && (this.vm.$inputs.indexOf(node.tagName.toLowerCase()) !== -1)) {
				node.value = value;
			}
			else {
				dom.setAttr.apply(this, arguments);
			}
		}
	}

	/**
	 * 更新节点的 classname realize v-bind:class
	 * @param   {DOMElement}          node
	 * @param   {String|Boolean}      newcls
	 * @param   {String|Boolean}      oldcls
	 * @param   {String}              classname
	 */
	up.updateClassName = function(node, newcls, oldcls, classname) {
		// 指定 classname 变化值由 newcls 布尔值决定
		if (classname) {
			if (newcls === true) {
				dom.addClass(node, classname);
			}
			else if (newcls === false) {
				dom.removeClass(node, classname);
			}
		}
		// 未指定 classname 变化值由 newcls 的值决定
		else {
			if (newcls) {
				dom.addClass(node, newcls);
			}

			if (oldcls) {
				dom.removeClass(node, oldcls);
			}
		}
	}

	/**
	 * 更新节点的 style realize v-bind:style
	 * @param   {DOMElement}  node
	 * @param   {String}      propperty  [属性名称]
	 * @param   {String}      value      [样式值]
	 */
	up.updateStyle = function(node, propperty, value) {
		node.style[propperty] = value;
	}

	/**
	 * 更新节点绑定事件的回调函数 realize v-on
	 * @param   {DOMElement}  node
	 * @param   {String}      evt          [事件名称]
	 * @param   {Function}    func         [回调函数]
	 * @param   {Function}    oldfunc      [旧回调函数，会被移除]
	 * @param   {Array}       params       [参数]
	 * @param   {String}      identifier   [对应监测字段/路径]
	 */
	up.updateEvent = function(node, evt, func, oldfunc, params, identifier) {
		var listeners = this.$listeners;
		var modals, self, stop, prevent, capture = false;

		// 支持 4 种事件修饰符 .self .stop .prevent .capture
		if (evt.indexOf('.') !== -1) {
			modals = evt.split('.');
			evt = modals.shift();
			self = modals && modals.indexOf('self') !== -1;
			stop = modals && modals.indexOf('stop') !== -1;
			prevent = modals && modals.indexOf('prevent') !== -1;
			capture = modals && modals.indexOf('capture') !== -1;
		}

		if (oldfunc) {
			dom.removeEvent(node, evt, listeners[identifier], capture);
		}

		if (util.isFunc(func)) {
			// 缓存事件回调
			listeners[identifier] = function _listener(e) {
				var args = [];

				// 是否限定只能在当前节点触发事件
				if (self && e.target !== node) {
					return;
				}

				// 组合事件参数
				util.each(params, function(param) {
					args.push(param === '$event' ? e : param);
				});

				// 未指定参数，则原生事件对象作为唯一参数
				if (!args.length) {
					args.push(e);
				}

				func.apply(this, args);

				// 是否阻止冒泡
				if (stop) {
					e.stopPropagation();
				}
				// 是否阻止默认事件
				if (prevent) {
					e.preventDefault();
				}
			}

			dom.addEvent(node, evt, listeners[identifier], capture);
		}
		else {
			util.warn('The model: ' + identifier + '\'s value for using v-on must be a type of Function!');
		}
	}

	/**
	 * 更新 text 或 textarea 的 value realize v-model
	 * @param   {Input}  text
	 * @param   {String} value
	 */
	up.updateTextValue = function(text, value) {
		if (text.value !== value) {
			text.value = value;
		}
	}

	/**
	 * 更新 radio 的激活状态 realize v-model
	 * @param   {Input}  radio
	 * @param   {String} value
	 */
	up.updateRadioChecked = function(radio, value) {
		radio.checked = radio.value === (util.isNumber(value) ? String(value) : value);
	}

	/**
	 * 更新 checkbox 的激活状态 realize v-model
	 * @param   {Input}          checkbox
	 * @param   {Array|Boolean}  values      [激活数组或状态]
	 */
	up.updateCheckboxChecked = function(checkbox, values) {
		if (!util.isArray(values) && !util.isBool(values)) {
			util.warn('checkbox v-model value must be a type of Boolean or Array!');
			return;
		}
		checkbox.checked = util.isBool(values) ? values : (values.indexOf(checkbox.value) !== -1);
	}

	/**
	 * 更新 select 的激活状态 realize v-model
	 * @param   {Select}         select
	 * @param   {Array|String}   selected  [选中值]
	 * @param   {Boolean}        multi
	 */
	up.updateSelectChecked = function(select, selected, multi) {
		var i, option, value;
		var options = select.options, leng = options.length;
		var multiple = multi || dom.hasAttr(select, 'multiple');

		for (i = 0; i < leng; i++) {
			option = options[i];
			value = option.value;
			option.selected = multiple ? selected.indexOf(value) !== -1 : selected === value;
		}
	}

	return Updater;
});
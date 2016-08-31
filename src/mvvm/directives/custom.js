import { isFunc, warn } from '../../util';
import Parser, { linkParser } from '../parser';

/**
 * v-custom 指令解析模块
 */
export function VCustom () {
	Parser.apply(this, arguments);
}

var vcustom = linkParser(VCustom);

/**
 * 解析 v-custom 指令
 */
vcustom.parse = function () {
	var desc = this.desc;
	var customs = this.vm.$customs;
	var update = customs[desc.args];

	if (!isFunc(update)) {
		return warn('Custom directive ['+ desc.attr +'] must define with a refresh function!');
	}

	this.update = update;
	this.bind();
}
import constructionSite from './construction-site';
import container from './container';
import controller from './controller';
import creep from './creep';
import road from './road';
import room from './room';
import source from './source';
import spawn from './spawn';

export function bindAllProcessorIntents() {
	constructionSite();
	container();
	controller();
	creep();
	road();
	room();
	source();
	spawn();
}

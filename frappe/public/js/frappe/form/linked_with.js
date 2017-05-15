// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

frappe.provide("frappe.ui.form");

"use strict";
frappe.ui.form.LinkedWith = class LinkedWith {

	constructor(opts) {
		$.extend(this, opts);
	}

	show() {
		if(!this.dialog)
			this.make_dialog();

		$(this.dialog.body).html(
			`<div class="text-muted text-center" style="padding: 30px 0px">
				${__("Loading")}...
			</div>`);

		this.dialog.show();
	}

	make_dialog() {
		var me = this;

		this.dialog = new frappe.ui.Dialog({
			hide_on_page_refresh: true,
			title: __("Linked With")
		});

		this.dialog.on_page_show = function() {
			// execute ajax calls sequentially
			// 1. get linked doctypes
			// 2. load all doctypes
			// 3. load linked docs
			this.get_linked_doctypes()
				.then(function() { this.load_doctypes()})
				.then(function() { this.links_not_permitted_or_missing()})
				.then(function() { this.get_linked_docs()})
				.then(function() { this.make_html()})
		}
	}

	make_html() {
		"use strict";
		const linked_docs = this.frm.__linked_docs;

		let html;

		if(Object.keys(linked_docs).length === 0) {
			html = __("Not Linked to any record");
		} else {
			html = Object.keys(linked_docs).map(function(dt) {
				return `<div class="list-item-table" style="margin-bottom: 15px">
					${this.make_doc_head(dt)}
					${linked_docs[dt]
						.map(function(doc) { this.make_doc_row(doc, dt)))
						.join("")}
				</div>`;
			});
		}

		$(this.dialog.body).html(html);
	}

	load_doctypes() {
		"use strict";
		const already_loaded = Object.keys(locals.DocType);
		let doctypes_to_load = [];

		if (this.frm.__linked_doctypes) {
			doctypes_to_load =
				Object.keys(this.frm.__linked_doctypes)
				.filter(function(doctype) { !already_loaded.includes(doctype)});
		}

		// load all doctypes asynchronously using with_doctype
		const promises = doctypes_to_load.map(function(dt) {
			return frappe.model.with_doctype(dt, function() {
				if(frappe.listview_settings[dt]) {
					// add additional fields to __linked_doctypes
					this.frm.__linked_doctypes[dt].add_fields =
						frappe.listview_settings[dt].add_fields;
				}
			});
		});

		return Promise.all(promises);
	}

	links_not_permitted_or_missing() {
		var me = this;
		"use strict";
		let links = null;

		links =
			Object.keys(this.frm.__linked_doctypes)
			.filter(frappe.model.can_get_report);

		let flag;
		if(!links) {
			$(this.dialog.body).html(
			`${this.frm.__linked_doctypes
				? __("Not enough permission to see links")
				: __("Not Linked to any record")}`);
			flag = true;
		}
		flag = false;

		// reject Promise if not_permitted or missing
		return new Promise(
			function(resolve, reject) { flag ? reject() : resolve()}
		);
	}

	get_linked_doctypes() {
		return new Promise(function(resolve, reject) {
			if (this.frm.__linked_doctypes) {
				resolve();
			}

			frappe.call({
				method: "frappe.desk.form.linked_with.get_linked_doctypes",
				args: {
					doctype: this.frm.doctype
				},
				callback: function(r) {
					this.frm.__linked_doctypes = r.message;
					resolve();
				}
			});
		});
	}

	get_linked_docs() {
		return frappe.call({
			method: "frappe.desk.form.linked_with.get_linked_docs",
			args: {
				doctype: this.frm.doctype,
				name: this.frm.docname,
				linkinfo: this.frm.__linked_doctypes,
				for_doctype: this.for_doctype
			},
			callback: function(r) {
				this.frm.__linked_docs = r.message || {};
			}
		});
	}

	make_doc_head(heading) {
		return `<div class="list-item list-item--head">
		<div class="list-item__content">
			${heading}
		</div></div>`;
	}

	make_doc_row(doc, doctype) {
		return `<div class="list-item-container">
			<div class="list-item">
				<div class="list-item__content bold">
					<a href="#Form/${doctype}/${doc.name}">${doc.name}</a>
				</div>
			</div>
		</div>`;
	}
}

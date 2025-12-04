"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAttachments = processAttachments;
exports.extractErrorInfo = extractErrorInfo;
const protobuf_1 = require("@stanterprise/protobuf");
/**
 * Process Playwright test attachments into protobuf Attachment objects
 */
function processAttachments(result) {
    const attachments = [];
    if (!result.attachments || result.attachments.length === 0) {
        return attachments;
    }
    for (const attachment of result.attachments) {
        const att = new protobuf_1.common.Attachment({
            name: attachment.name,
            mime_type: attachment.contentType,
        });
        // Use path as URI if available, otherwise use the body content
        if (attachment.path) {
            att.uri = attachment.path;
        }
        else if (attachment.body) {
            att.content = attachment.body;
        }
        attachments.push(att);
    }
    return attachments;
}
/**
 * Extract error information from test results
 */
function extractErrorInfo(result) {
    let errorMessage = "";
    let stackTrace = "";
    const errors = [];
    if (result.errors && result.errors.length > 0) {
        errorMessage = result.errors.map((e) => e.message || "").join("\n");
        stackTrace = result.errors.map((e) => e.stack || "").join("\n");
        errors.push(...result.errors.map((e) => e.message || ""));
    }
    return { errorMessage, stackTrace, errors };
}

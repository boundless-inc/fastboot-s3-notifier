"use strict";

const AWS  = require('aws-sdk');

const DEFAULT_POLL_TIME = 3 * 1000;

class S3Notifier {
  constructor(options) {
    this.ui = options.ui;
    this.bucket = options.bucket;
    this.key = options.key;
    this.subscribers = [];
    this.pollTime = options.poll || DEFAULT_POLL_TIME;

    this.params = {
      Bucket: this.bucket,
      Key: this.key
    };

    this.s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      signatureVersion: 'v4',
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
      region: options.region
    });
  }

  subscribe(notify) {
    this.subscribers.push(notify);

    return this.getCurrentLastModified()
      .then(() => this.schedulePoll());
  }

  getCurrentLastModified() {
    return this.s3.headObject(this.params).promise()
      .then(data => {
        return this.lastModified = data.LastModified;
      })
      .catch(() => {
        this.ui.writeError('error fetching S3 last modified; notifications disabled');
      });
  }

  schedulePoll() {
    if(!this.timeout) {
      this.timeout = setTimeout(() => {
        this.poll();
      }, this.pollTime);
    }
  }

  poll() {
    this.s3.headObject(this.params).promise()
      .then(data => {
        this.timeout = null;
        this.compareLastModifieds(data.LastModified);
        this.schedulePoll();
      });
  }

  compareLastModifieds(newLastModified) {
    if (newLastModified.getTime() !== this.lastModified.getTime()) {
      this.ui.writeLine('config modified; old=%s; new=%s', this.lastModified, newLastModified);
      this.lastModified = newLastModified;
      this.subscribers.forEach((sub) => sub(newLastModified));
    }
  }
}


module.exports = S3Notifier;

import crypto from 'node:crypto';

// ==========================================
// Mikrotik RouterOS API Protocol Handler
// ==========================================

export interface RouterOSSentence {
  type: '!re' | '!done' | '!trap' | '!fatal' | string;
  attributes: Record<string, string>;
  rawWords: string[];
}

export class RouterOSProtocol {
  /**
   * Encode a word (string or buffer) into RouterOS length-prefixed bytes
   */
  static encodeWord(word: string | Buffer): Buffer {
    const wordBuf = typeof word === 'string' ? Buffer.from(word, 'utf8') : word;
    const len = wordBuf.length;
    let lenBuf: Buffer;

    if (len < 0x80) {
      lenBuf = Buffer.from([len]);
    } else if (len < 0x4000) {
      lenBuf = Buffer.from([(len >> 8) | 0x80, len & 0xff]);
    } else if (len < 0x200000) {
      lenBuf = Buffer.from([(len >> 16) | 0xc0, (len >> 8) & 0xff, len & 0xff]);
    } else if (len < 0x10000000) {
      lenBuf = Buffer.from([
        (len >> 24) | 0xe0,
        (len >> 16) & 0xff,
        (len >> 8) & 0xff,
        len & 0xff,
      ]);
    } else {
      lenBuf = Buffer.from([
        0xf0,
        (len >> 24) & 0xff,
        (len >> 16) & 0xff,
        (len >> 8) & 0xff,
        len & 0xff,
      ]);
    }

    return Buffer.concat([lenBuf, wordBuf]);
  }

  /**
   * Encode a full sentence (list of words) terminated by an empty word (0x00)
   */
  static encodeSentence(words: (string | Buffer)[]): Buffer {
    const buffers: Buffer[] = [];
    for (const w of words) {
      buffers.push(this.encodeWord(w));
    }
    // Sentence terminator (empty word -> length 0 byte)
    buffers.push(Buffer.from([0x00]));
    return Buffer.concat(buffers);
  }

  /**
   * Parse sentences from incoming stream buffer
   * Returns parsed sentences and the remaining unparsed buffer
   */
  static decodeStream(buffer: Buffer): { sentences: RouterOSSentence[]; remaining: Buffer } {
    const sentences: RouterOSSentence[] = [];
    let offset = 0;
    let currentSentenceWords: string[] = [];

    while (offset < buffer.length) {
      const lenResult = this.decodeLength(buffer, offset);
      if (!lenResult) {
        // Incomplete length header, wait for more data
        break;
      }

      const { length, bytesRead } = lenResult;

      if (length === 0) {
        // End of sentence
        offset += bytesRead;
        if (currentSentenceWords.length > 0) {
          sentences.push(this.parseSentence(currentSentenceWords));
          currentSentenceWords = [];
        }
        continue;
      }

      if (offset + bytesRead + length > buffer.length) {
        // Incomplete word payload, wait for more data
        break;
      }

      const wordBuf = buffer.subarray(offset + bytesRead, offset + bytesRead + length);
      currentSentenceWords.push(wordBuf.toString('utf8'));
      offset += bytesRead + length;
    }

    return {
      sentences,
      remaining: Buffer.from(buffer.subarray(offset)),
    };
  }

  /**
   * Decode length prefix
   */
  private static decodeLength(buffer: Buffer, offset: number): { length: number; bytesRead: number } | null {
    if (offset >= buffer.length) return null;

    const b0 = buffer[offset];

    if ((b0 & 0x80) === 0) {
      return { length: b0, bytesRead: 1 };
    }

    if ((b0 & 0xc0) === 0x80) {
      if (offset + 1 >= buffer.length) return null;
      const b1 = buffer[offset + 1];
      const length = ((b0 & 0x3f) << 8) | b1;
      return { length, bytesRead: 2 };
    }

    if ((b0 & 0xe0) === 0xc0) {
      if (offset + 2 >= buffer.length) return null;
      const b1 = buffer[offset + 1];
      const b2 = buffer[offset + 2];
      const length = ((b0 & 0x1f) << 16) | (b1 << 8) | b2;
      return { length, bytesRead: 3 };
    }

    if ((b0 & 0xf0) === 0xe0) {
      if (offset + 3 >= buffer.length) return null;
      const b1 = buffer[offset + 1];
      const b2 = buffer[offset + 2];
      const b3 = buffer[offset + 3];
      const length = ((b0 & 0x0f) << 24) | (b1 << 16) | (b2 << 8) | b3;
      return { length, bytesRead: 4 };
    }

    if (b0 === 0xf0) {
      if (offset + 4 >= buffer.length) return null;
      const b1 = buffer[offset + 1];
      const b2 = buffer[offset + 2];
      const b3 = buffer[offset + 3];
      const b4 = buffer[offset + 4];
      const length = (b1 << 24) | (b2 << 16) | (b3 << 8) | b4;
      return { length, bytesRead: 5 };
    }

    return null;
  }

  /**
   * Convert an array of raw words into structured RouterOSSentence
   */
  private static parseSentence(words: string[]): RouterOSSentence {
    const type = words[0] || '';
    const attributes: Record<string, string> = {};

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      if (word.startsWith('=')) {
        const secondEq = word.indexOf('=', 1);
        if (secondEq !== -1) {
          const key = word.substring(1, secondEq);
          const value = word.substring(secondEq + 1);
          attributes[key] = value;
        } else {
          const key = word.substring(1);
          attributes[key] = '';
        }
      } else if (word.startsWith('.tag=')) {
        attributes['.tag'] = word.substring(5);
      }
    }

    return {
      type,
      attributes,
      rawWords: words,
    };
  }

  /**
   * Compute legacy MD5 challenge response for RouterOS <= 6.42
   */
  static computeChallengeResponse(password: string, challengeHex: string): string {
    const challengeBuf = Buffer.from(challengeHex, 'hex');
    const zeroByte = Buffer.from([0]);
    const passBuf = Buffer.from(password, 'utf8');

    const combined = Buffer.concat([zeroByte, passBuf, challengeBuf]);
    return crypto.createHash('md5').update(combined).digest('hex');
  }
}

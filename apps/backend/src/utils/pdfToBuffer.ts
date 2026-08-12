import { Writable } from 'stream';
import { Buffer } from 'buffer';

class BufferWritable extends Writable {
  private chunks: Buffer[] = [];

  _write(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
    this.chunks.push(Buffer.from(chunk));
    callback();
  }

  toBuffer() {
    return Buffer.concat(this.chunks);
  }
}

export function pdfToBuffer(generatorFn: (stream: any) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const stream = new BufferWritable();
    stream.on('finish', () => resolve(stream.toBuffer()));
    stream.on('error', (err) => reject(err));
    generatorFn(stream);
  });
}

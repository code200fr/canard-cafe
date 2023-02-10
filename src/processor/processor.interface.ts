import { ParsedIndex } from '../content-parser/parsed-index';
import { ProcessorOptions } from './processor-factory.service';

export interface ProcessorInterface {
  name: string;
  run: (index: ParsedIndex, options?: ProcessorOptions) => Promise<unknown>;
}

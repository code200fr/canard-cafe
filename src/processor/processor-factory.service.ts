import { Inject, Injectable } from '@nestjs/common';
import { TfidfService } from './tfidf/tfidf.service';
import { ProcessorInterface } from './processor.interface';
import { ParsedIndex } from '../content-parser/parsed-index';
import { SmileyProcessorService } from './smiley/smiley-processor.service';

@Injectable()
export class ProcessorFactoryService {
  protected processors: Map<string, ProcessorInterface> = new Map<
    string,
    ProcessorInterface
  >();

  constructor(
    @Inject(TfidfService) tfidf: TfidfService,
    @Inject(SmileyProcessorService) smiley: SmileyProcessorService,
  ) {
    this.processors.set(tfidf.name, tfidf);
    this.processors.set(smiley.name, smiley);
  }

  hasProcessor(name: string): boolean {
    return this.processors.has(name);
  }

  names(): string[] {
    return Array.from(this.processors.keys());
  }

  run(
    processorName: string,
    index: ParsedIndex,
    options?: ProcessorOptions,
  ): Promise<unknown> {
    if (!this.processors.has(processorName)) {
      throw `Unknown processor ${processorName}`;
    }

    return this.processors.get(processorName).run(index, options);
  }
}

export interface ProcessorOptions {
  [option: string]: unknown;
}

export type ProcessorsData = Map<string, unknown>;

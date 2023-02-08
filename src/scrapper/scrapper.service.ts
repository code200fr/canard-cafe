import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import path from 'path';
import fs from 'fs';

@Injectable()
export class ScrapperService {
  delay = 2000;
  protected readonly logger = new Logger(ScrapperService.name);

  constructor(private readonly httpService: HttpService) {}

  load(url: string): Observable<AxiosResponse<string>> {
    return this.httpService.get(url);
  }

  async loadTopic(topicUrl: string): Promise<void> {
    this.logger.log('Loading next topic......');
    let page = 1;

    let content: string = await this.loadPage(topicUrl, page);
    await this.wait();

    page++;
    let link: string = this.getLink(topicUrl, page);
    const id: number = parseInt(link.replace('threads/', '').split('-')[0], 10);

    this.saveHTML(id, 1, content);

    while (content.indexOf(link) > 0) {
      content = await this.loadPage(topicUrl, page);
      this.saveHTML(id, page, content);

      await this.wait();
      page++;
      link = this.getLink(topicUrl, page);
    }
  }

  protected getLink(topicUrl: string, page = 1): string {
    let link: string = decodeURIComponent(this.getPageUrl(topicUrl, page));
    link = link.replace('https://forum.canardpc.com/', '');

    return link;
  }

  protected saveHTML(id: number, page: number, html: string): void {
    const saveDir = path.join('./var/raw', id.toString(10));

    try {
      fs.mkdirSync(saveDir, {
        recursive: true,
      });
    } catch (e) {
      // already exists
    }

    const savePath = path.join(saveDir, page.toString(10) + '.html');

    fs.writeFileSync(savePath, html);
  }

  protected async loadPage(topicUrl: string, page = 1): Promise<string> {
    const url: string = this.getPageUrl(topicUrl, page);
    this.logger.log(url);

    return new Promise((resolve: (value: string) => void) => {
      this.load(url).subscribe((content: AxiosResponse<string>) => {
        return resolve(content.data);
      });
    });
  }

  protected getPageUrl(topicUrl: string, page = 1): string {
    return topicUrl + '/page' + page.toString(10);
  }

  protected wait(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.delay));
  }
}

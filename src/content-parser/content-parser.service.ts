import { Injectable, Logger } from '@nestjs/common';
import path from 'path';
import fs from 'fs';
import parse, { HTMLElement } from 'node-html-parser';

@Injectable()
export class ContentParserService {
  protected readonly logger = new Logger(ContentParserService.name);

  async parseTopic(id: number): Promise<ParsedTopicPage[]> {
    const topicPath: string = path.join('./var/raw', id.toString(10));

    const files: string[] = fs
      .readdirSync(topicPath, {
        withFileTypes: true,
      })
      .filter((file) => !file.isDirectory())
      .map((file) => file.name);

    const pages: ParsedTopicPage[] = [];

    for (const file of files) {
      const filePath: string = path.join(topicPath, file);
      const topicPage: ParsedTopicPage = await this.parseFile(filePath);
      pages.push(topicPage);
    }

    return pages;
  }

  async parseFile(filePath: string): Promise<ParsedTopicPage> {
    const html: string = fs.readFileSync(filePath, 'utf8');
    const root: HTMLElement = parse(html);

    const titleElement: HTMLElement = root.querySelector('head title');
    const idElement: HTMLElement = root.querySelector(
      'input[type="hidden"][name="t"]',
    );
    const canonicalElement: HTMLElement = root.querySelector(
      'link[rel="canonical"]',
    );

    const title: string = titleElement.textContent.replace(
      /( \- Page \d+)/gm,
      '',
    );
    const topicId: number = parseInt(idElement.attributes['value']);
    const href: string = canonicalElement.attributes['href'];

    const baseUrl: string = href.split('?')[0];
    const parts: string[] = baseUrl.split('/');
    const topicUrl: string =
      'https://forum.canardpc.com' + parts[0] + '/' + parts[1];
    const page: number =
      parts.length > 2 ? Number(parts[2].replace('/page', '')) : 1;

    this.logger.log(title);

    const messageElements: HTMLElement[] =
      root.querySelectorAll('.postcontainer');

    const topic: ParsedTopic = {
      title: title,
      id: topicId,
      url: topicUrl,
    };

    const topicPage: ParsedTopicPage = {
      topic: topic,
      page: page,
      posts: [],
    };

    for (const messageElement of messageElements) {
      const userLink: HTMLElement = messageElement.querySelector('.username');
      const messageId = Number(
        messageElement.attributes['id'].split('_').pop(),
      );

      const authorName: string = userLink.textContent.trim();
      const authorUrl: string = userLink.attributes['href'];
      const authorId = Number(/\/(\d+)/gm.exec(authorUrl)[1]);
      const authorTitle: string = messageElement
        .querySelector('.usertitle')
        .textContent.trim();
      const avatarImg: HTMLElement = messageElement.querySelector(
        '.postuseravatar img',
      );
      let avatarUrl: string = null;

      if (avatarImg) {
        avatarUrl = avatarImg.attributes['src'];
      }

      const author: ParsedAuthor = {
        id: authorId,
        name: authorName,
        url: authorUrl,
        title: authorTitle,
        avatar: avatarUrl,
      };

      const quotesElements: HTMLElement[] =
        messageElement.querySelectorAll('.bbcode_quote');

      const quotes: ParsedQuote[] = [];

      for (const quoteElement of quotesElements) {
        const quoteFromElement: HTMLElement = quoteElement.querySelector(
          '.bbcode_postedby strong',
        );
        let from: string = null;

        if (quoteFromElement) {
          from = quoteFromElement.textContent.trim();
        }

        const message: string = quoteElement
          .querySelector('.message')
          .textContent.trim();

        quoteElement.remove();

        quotes.push({
          author: {
            name: from,
          },
          message: message,
        });
      }

      const post: ParsedPost = {
        author: author,
        quotes: quotes,
        page: page,
        id: messageId,
      };

      topicPage.posts.push(post);
    }

    return topicPage;
  }
}

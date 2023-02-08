interface ParsedTopicPage {
  topic: ParsedTopic;
  page: number;
  posts: ParsedPost[];
}

interface ParsedTopic {
  id: number;
  title: string;
  url: string;
}

interface ParsedPost {
  id: number;
  page: number;
  message: string;
  date: number;
  author: ParsedAuthor;
  quotes?: ParsedQuote[];
  smileys?: string[];
}

interface ParsedAuthor {
  id: number;
  name: string;
  title: string;
  url: string;
  avatar: string;
}

interface ParsedQuote {
  message: string;
  author: {
    name: string;
    id?: number;
  };
}

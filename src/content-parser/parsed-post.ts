interface ParsedTopicPage {
  topic: ParsedTopic;
  page: number;
  posts: ParsedPost[];
}

interface ParsedPost {
  id: number;
  page: number;
  author: ParsedAuthor;
  quotes?: ParsedQuote[];
}

interface ParsedTopic {
  id: number;
  title: string;
  url: string;
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

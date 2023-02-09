export class ParsedIndex {
  public users: Map<number, ParsedUser> = new Map<number, ParsedUser>();
  public topics: Map<number, ParsedTopic> = new Map<number, ParsedTopic>();

  public aggregateUserPosts() {
    this.topics.forEach((topic: ParsedTopic) => {
      topic.posts.forEach((post: ParsedPost) => {
        const user: ParsedUser = this.users.get(post.author);

        if (!user) {
          return;
        }

        if (!user.messages) {
          user.messages = [];
        }

        user.messages.push(post.message);
      });
    });
  }

  public unSerialize(data: ParsedData): ParsedIndex {
    this.users.clear();
    this.topics.clear();

    Object.entries(data.users).forEach((userData: [string, ParsedUser]) => {
      this.users.set(parseInt(userData[0], 10), userData[1]);
    });

    Object.entries(data.topics).forEach((topicData: [string, ParsedTopic]) => {
      this.topics.set(parseInt(topicData[0], 10), topicData[1]);
    });

    return this;
  }

  public serialize(): ParsedData {
    return {
      users: Object.fromEntries(this.users),
      topics: Object.fromEntries(this.topics),
    };
  }
}

export interface ParsedData {
  users: {
    [id: number]: ParsedUser;
  };
  topics: {
    [id: number]: ParsedTopic;
  };
}

export interface ParsedTopic {
  id: number;
  title: string;
  url: string;
  op?: number; // ParsedUser.id
  posts: ParsedPost[];
}

export interface ParsedUser {
  id: number;
  name: string;
  title?: string;
  url: string;
  avatar?: string;
  messages?: string[];
}

export interface ParsedPost {
  id: number;
  page: number;
  message: string;
  date: number; // Timestamp ms
  topic: number; // ParsedTopic.id
  author: number; // ParsedUser.id
  quotes?: ParsedQuote[];
  smileys?: string[];
}

export interface ParsedQuote {
  message: string;
  authorName: string;
  author?: number; // ParsedUser.id, if available
}

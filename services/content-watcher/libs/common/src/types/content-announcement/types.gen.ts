// This file is auto-generated by @hey-api/openapi-ts

export enum AnnouncementType {
  Tombstone = 0,
  Broadcast = 2,
  Reply = 3,
  Reaction = 4,
  Profile = 5,
  Update = 6,
  PublicFollows = 113,
}

export type AnnouncementResponse = {
  /**
   * An optional identifier for the request, may be used for tracking or correlation
   */
  requestId?: string;
  /**
   * An optional webhook URL registered as part of a specific search request
   */
  webhookUrl?: string;
  /**
   * Identifier for the schema being used or referenced
   */
  schemaId: number;
  /**
   * The block number on the blockchain where this announcement was recorded
   */
  blockNumber: number;
  announcement: TombstoneAnnouncement | BroadcastAnnouncement | ReplyAnnouncement | ReactionAnnouncement | ProfileAnnouncement | UpdateAnnouncement;
};

export type TypedAnnouncement = {
  announcementType: AnnouncementType;
  fromId: string;
};

export type TombstoneAnnouncement = TypedAnnouncement & {
  targetAnnouncementType: number;
  targetContentHash: string;
};

export type BroadcastAnnouncement = TypedAnnouncement & {
  contentHash: string;
  url: string;
};

export type ReplyAnnouncement = TypedAnnouncement & {
  contentHash: string;
  inReplyTo: string;
  url: string;
};

export type ReactionAnnouncement = TypedAnnouncement & {
  emoji: string;
  inReplyTo: string;
  apply: number;
};

export type ProfileAnnouncement = TypedAnnouncement & {
  contentHash: string;
  url: string;
};

export type UpdateAnnouncement = TypedAnnouncement & {
  contentHash: string;
  targetAnnouncementType: number;
  targetContentHash: string;
  url: string;
};

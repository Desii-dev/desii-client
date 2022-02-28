import { TagPostRelation as TagPostRelationType } from '@prisma/client'
import { extendType, nonNull, objectType, stringArg } from 'nexus'

export const TagPostRelation = objectType({
  name: 'TagPostRelation',
  definition(t) {
    t.nonNull.string('id')
    t.nonNull.string('tagId')
    t.nonNull.string('postId')
    t.nonNull.field('createdAt', {
      type: 'DateTime',
    })
    t.nonNull.field('updatedAt', {
      type: 'DateTime',
    })
    t.nonNull.field('tag', {
      type: 'Tag',
    })
    t.nonNull.field('post', {
      type: 'Post',
    })
  },
})

export const GetTagPostRelationsQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('GetTagPostRelationsQuery', {
      type: 'TagPostRelation',
      args: {
        tagId: stringArg(),
        postId: stringArg(),
      },
      resolve(_parent, args, ctx) {
        const query: Partial<TagPostRelationType> = {}
        if (args.tagId) query.tagId = args.tagId
        if (args.postId) query.postId = args.postId

        return ctx.prisma.tagPostRelation.findMany({
          where: query,
          include: {
            tag: true,
            post: true,
          },
        })
      },
    })
  },
})

export const CreateTagPostRelationMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('createTagPostRelation', {
      type: 'TagPostRelation',
      args: {
        tagId: nonNull(stringArg()),
        postId: nonNull(stringArg()),
      },
      async resolve(_parent, args, ctx) {
        if (!ctx.user) {
          throw new Error('ログインユーザーが存在しません')
        }

        const tag = await ctx.prisma.tag.findUnique({
          where: {
            id: args.tagId,
          },
        })

        const post = await ctx.prisma.post.findUnique({
          where: {
            id: args.postId,
          },
        })

        if (!tag || !post) {
          throw new Error('タグ、または投稿が存在しません')
        }

        if (ctx.user.id !== post.createdUserId) {
          throw new Error('作成者しかタグを追加できません')
        }

        return ctx.prisma.tagPostRelation.create({
          data: {
            tagId: args.tagId,
            postId: args.postId,
          },
          include: {
            tag: true,
            post: true,
          },
        })
      },
    })
  },
})

export const DeleteTagPostRelationMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('DeleteTagPostRelation', {
      type: 'TagPostRelation',
      args: {
        tagId: nonNull(stringArg()),
        postId: nonNull(stringArg()),
      },
      async resolve(_parent, args, ctx) {
        if (!ctx.user) {
          throw new Error('ログインユーザーが存在しません')
        }

        const tagPostRelation = await ctx.prisma.tagPostRelation.findUnique({
          where: {
            tagPostRelationId: {
              tagId: args.tagId,
              postId: args.postId,
            },
          },
          include: {
            post: true,
          },
        })

        if (!tagPostRelation) {
          throw new Error('tagPostRelationが存在しません')
        }

        if (ctx.user.id !== tagPostRelation.post.createdUserId) {
          throw new Error('作成者しかタグを削除できません')
        }

        return ctx.prisma.tagPostRelation.delete({
          where: {
            tagPostRelationId: {
              tagId: args.tagId,
              postId: args.postId,
            },
          },
          include: {
            tag: true,
            post: true,
          },
        })
      },
    })
  },
})

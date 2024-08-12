import { act, cleanup, screen } from '@testing-library/react';
import React from 'react';

import content from 'models/content';
import Post, { getStaticProps } from 'pages/[username]/[slug]/index.public';
import * as mock from 'tests/mock-interface.js';
import orchestrator from 'tests/orchestrator.js';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.dropAllTables();
  await orchestrator.runPendingMigrations();
});

afterEach(() => cleanup());

describe('Post', () => {
  const createComment = async (owner_id, parent_id, body) => {
    return await orchestrator.createContent({
      owner_id: owner_id,
      parent_id: parent_id,
      body: body,
      status: 'published',
    });
  };

  const loadPostProps = async (user, post) => {
    const context = {
      params: {
        username: user.username,
        slug: post.slug,
      },
    };
    const { props } = await getStaticProps(context);
    return props;
  };

  it('should render a thread from an initial deleted comment', async () => {
    const primaryUser = await orchestrator.createUser();
    const secondaryUser = await orchestrator.createUser();
    const tertiaryUser = await orchestrator.createUser();

    const defaultPost = await orchestrator.createContent({
      owner_id: primaryUser.id,
      title: 'Primeiro post criado',
      body: 'Conteúdo do primeiro post criado',
      status: 'published',
    });

    const firstComment = await createComment(secondaryUser.id, defaultPost.id, 'Primeiro comentário');
    await createComment(tertiaryUser.id, firstComment.id, 'Segundo comentário');
    await createComment(tertiaryUser.id, firstComment.id, 'Terceiro comentário');

    await orchestrator.updateContent(firstComment.id, { status: 'deleted' });

    const props = await loadPostProps(primaryUser, defaultPost);
    const { baseElement, getByText } = mock.rendering(<Post {...props} />, {
      route: `/${primaryUser.username}/${defaultPost.slug}`,
    });

    const deletedContentElement = getByText('Conteúdo deletado');
    const articleDeletedElement = deletedContentElement.closest('article');

    expect(baseElement).toContain(getByText('Primeiro post criado'));

    expect(baseElement).toContain(deletedContentElement);
    expect(screen.queryByText('Primeiro comentário')).toBeNull();
    expect(articleDeletedElement.querySelector(`a[href="/${secondaryUser.username}/${firstComment.id}"]`)).toBeNull();
    expect(articleDeletedElement.parentElement.closest('button')).toBeNull();

    expect(baseElement).toContain(getByText('Segundo comentário'));
    expect(baseElement).toContain(getByText('Terceiro comentário'));
  });

  it('should comment counter be equal to published rendered children', async () => {
    const primaryUser = await orchestrator.createUser();
    const secondaryUser = await orchestrator.createUser();

    const defaultPost = await orchestrator.createContent({
      owner_id: primaryUser.id,
      title: 'Primeiro post criado',
      body: 'Conteúdo do primeiro post criado',
      status: 'published',
    });

    const firstComment = await createComment(secondaryUser.id, defaultPost.id, 'Primeiro comentário');
    await createComment(primaryUser.id, firstComment.id, 'Segundo comentário');
    await createComment(secondaryUser.id, firstComment.id, 'Terceiro comentário');

    await orchestrator.updateContent(firstComment.id, { status: 'deleted' });

    const props = await loadPostProps(primaryUser, defaultPost);
    const { baseElement, getByText } = mock.rendering(<Post {...props} />, {
      route: `/${primaryUser.username}/${defaultPost.slug}`,
    });

    let post;
    await act(async () => (post = await content.findOne({ where: { id: defaultPost.id } })));

    expect(post.children_deep_count).toBe('2');
    expect(baseElement).toContain(getByText('Primeiro post criado'));
    expect(baseElement).toContain(getByText('Segundo comentário'));
    expect(baseElement).toContain(getByText('Terceiro comentário'));
  });

  it('should not render all comments from a almost full deleted thread', async () => {
    const primaryUser = await orchestrator.createUser();
    const secondaryUser = await orchestrator.createUser();

    const defaultPost = await orchestrator.createContent({
      owner_id: primaryUser.id,
      title: 'Primeiro post criado',
      body: 'Conteúdo do primeiro post criado',
      status: 'published',
    });

    const firstComment = await createComment(secondaryUser.id, defaultPost.id, 'Primeiro comentário');
    const secondComment = await createComment(primaryUser.id, firstComment.id, 'Segundo comentário');
    await createComment(secondaryUser.id, secondComment.id, 'Terceiro comentário');

    await orchestrator.updateContent(firstComment.id, { status: 'deleted' });
    await orchestrator.updateContent(secondComment.id, { status: 'deleted' });

    const props = await loadPostProps(primaryUser, defaultPost);
    const { baseElement, getByText, getAllByText } = mock.rendering(<Post {...props} />, {
      route: `/${primaryUser.username}/${defaultPost.slug}`,
    });

    expect(screen.queryByText('Primeiro comentário')).toBeNull();
    expect(screen.queryByText('Segundo comentário')).toBeNull();
    expect(getAllByText('Conteúdo deletado').length).toBe(1);
    expect(baseElement).toContain(getByText('Terceiro comentário'));
  });
});

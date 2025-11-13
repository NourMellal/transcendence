import { FastifyInstance } from 'fastify';
import { FriendsController } from '../controllers/friends.controller.js';

export async function registerFriendsRoutes(
    fastify: FastifyInstance,
    friendsController: FriendsController
) {
    // Send friend request
    fastify.post('/friends/requests', {
        schema: {
            body: {
                type: 'object',
                required: ['toUserId'],
                properties: {
                    toUserId: { type: 'string' },
                    message: { type: 'string' }
                }
            }
        }
    }, friendsController.sendFriendRequest.bind(friendsController));

    // Accept friend request
    fastify.post('/friends/requests/accept', {
        schema: {
            body: {
                type: 'object',
                required: ['friendshipId'],
                properties: {
                    friendshipId: { type: 'string' }
                }
            }
        }
    }, friendsController.acceptFriendRequest.bind(friendsController));

    // Decline friend request
    fastify.post('/friends/requests/decline', {
        schema: {
            body: {
                type: 'object',
                required: ['friendshipId'],
                properties: {
                    friendshipId: { type: 'string' }
                }
            }
        }
    }, friendsController.declineFriendRequest.bind(friendsController));

    // Remove friend
    fastify.delete('/friends/:friendId', {
        schema: {
            params: {
                type: 'object',
                required: ['friendId'],
                properties: {
                    friendId: { type: 'string' }
                }
            }
        }
    }, friendsController.removeFriend.bind(friendsController));

    // Get friends list
    fastify.get('/friends', friendsController.getFriends.bind(friendsController));

    // Get pending friend requests (received)
    fastify.get('/friends/requests/pending', friendsController.getPendingRequests.bind(friendsController));

    // Get sent friend requests
    fastify.get('/friends/requests/sent', friendsController.getSentRequests.bind(friendsController));

    // Search users
    fastify.get('/users/search', {
        schema: {
            querystring: {
                type: 'object',
                required: ['query'],
                properties: {
                    query: { type: 'string', minLength: 2 }
                }
            }
        }
    }, friendsController.searchUsers.bind(friendsController));
}
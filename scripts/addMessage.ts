import { createMessage } from '../services/posts';

async function main() {
    try {
        await createMessage({
            authorUID: 'ssdkjd823923',
            createdAt: new Date('2025-03-30T19:22:40.000Z'),
            id: 1,
            text: 'Yoh',
            threadId: '/threads/123'
        });
        console.log('Message added successfully');
    } catch (error) {
        console.error('Error adding message:', error);
    }
}

main(); 
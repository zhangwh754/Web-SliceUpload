const path = require('path');
const fs = require('fs');
const Koa = require('koa');
const Router = require('@koa/router');
const { koaBody } = require('koa-body');
const cors = require('@koa/cors');

const app = new Koa();
const router = new Router();

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
const chunksDir = path.join(__dirname, '../chunks');
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(chunksDir, { recursive: true });

// Configure koa-body for file uploads
app.use(koaBody({
    jsonLimit: '2mb', // 设置 JSON 请求体的最大大小
}));
app.use(cors());

// Upload chunk endpoint
router.post('/upload', async (ctx) => {
    const { chunk, filename, chunkIndex, totalChunks } = ctx.request.body;

    console.log(filename, chunkIndex, totalChunks);


    const chunkName = `${filename}.${chunkIndex}`;
    const chunkPath = path.join(chunksDir, chunkName);

    // Convert base64 to buffer and save
    const buffer = Buffer.from(chunk, 'base64');
    fs.writeFileSync(chunkPath, buffer);

    ctx.body = {
        code: 0,
        message: 'Chunk uploaded successfully',
        data: {
            chunkIndex,
            filename: chunkName
        }
    };
});

// Merge chunks endpoint
router.post('/merge', async (ctx) => {
    const { filename, totalChunks } = ctx.request.body;
    const chunks = [];

    // Verify all chunks exist
    for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(chunksDir, `${filename}.${i}`);
        if (!fs.existsSync(chunkPath)) {
            ctx.status = 400;
            ctx.body = {
                code: 1,
                message: `Chunk ${i} is missing`
            };
            return;
        }
        chunks.push(chunkPath);
    }

    // Merge chunks
    const writeStream = fs.createWriteStream(path.join(uploadDir, filename));

    for (const chunkPath of chunks) {
        const content = fs.readFileSync(chunkPath);
        writeStream.write(content);
        // Clean up chunk file
        fs.unlinkSync(chunkPath);
    }

    writeStream.end();

    ctx.body = {
        code: 0,
        message: 'File merged successfully',
        data: {
            filename
        }
    };
});

app.use(router.routes()).use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 
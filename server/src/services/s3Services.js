import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});
const BUCKET = process.env.SNAPSHOT_BUCKET;

export const saveSnapshot = async (docId, snapshot) => {
    await s3.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: `${docId}/latest.json`,
            Body: JSON.stringify(snapshot),
            ContentType: "application/json",
        })
    );
};


export const loadSnapshot = async (docId) => {
    try {
        const res = await s3.send(
            new GetObjectCommand({
                Bucket: BUCKET,
                Key: `${docId}/latest.json`,
            })
        );

        const body = await res.Body.transformToString();
        return JSON.parse(body);
    } catch {
        return null;
    }
};

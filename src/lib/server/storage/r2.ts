import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { isAppEvidencePath, parseEvidenceKey } from '$lib/evidence.js';
import { readPrivateEnv } from '$lib/server/env.js';

const EVIDENCE_PREFIX = 'evidence';

let s3Client: S3Client | undefined;

function readEnv(name: string): string {
	return readPrivateEnv(name);
}

function requireR2Config() {
	const accountId = readEnv('R2_ACCOUNT_ID');
	const accessKeyId = readEnv('R2_ACCESS_KEY_ID');
	const secretAccessKey = readEnv('R2_SECRET_ACCESS_KEY');
	const bucket = readEnv('R2_BUCKET');
	const publicBaseUrl = readEnv('R2_PUBLIC_BASE_URL');

	if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
		throw new Error(
			'R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_BASE_URL.'
		);
	}

	return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

function getS3Client(): S3Client {
	if (!s3Client) {
		const { accountId, accessKeyId, secretAccessKey } = requireR2Config();
		s3Client = new S3Client({
			region: 'auto',
			endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId,
				secretAccessKey
			}
		});
	}
	return s3Client;
}

export function evidenceKey(project: string, filename: string): string {
	return `${EVIDENCE_PREFIX}/${project}/${filename}`;
}

export function evidencePublicPath(project: string, filename: string): string {
	return `/evidence/${project}/${filename}`;
}

export function getPublicEvidenceUrl(project: string, filename: string): string {
	const { publicBaseUrl } = requireR2Config();
	const base = publicBaseUrl.replace(/\/$/, '');
	return `${base}/${evidenceKey(project, filename)}`;
}

export function canUseR2Storage(): boolean {
	try {
		requireR2Config();
		return true;
	} catch {
		return false;
	}
}

export async function saveEvidenceFile(
	project: string,
	filename: string,
	data: Buffer,
	contentType?: string
): Promise<string> {
	const { bucket } = requireR2Config();
	const key = evidenceKey(project, filename);

	await getS3Client().send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: data,
			ContentType: contentType || 'application/octet-stream'
		})
	);

	return evidencePublicPath(project, filename);
}

export async function deleteEvidenceBySrc(src: string, project: string): Promise<void> {
	if (!isAppEvidencePath(src)) return;

	const key = parseEvidenceKey(src, project);
	if (!key) return;

	const { bucket } = requireR2Config();

	try {
		await getS3Client().send(
			new DeleteObjectCommand({
				Bucket: bucket,
				Key: key
			})
		);
	} catch {
		// ignore missing objects
	}
}

// ============================================
// PM2 Ecosystem — Raspberry Pi production
// ============================================
// Usage: pm2 start ecosystem.config.cjs
//        pm2 save && pm2 startup

module.exports = {
	apps: [
		{
			name: "arbicore-api",
			cwd: "./backend",
			script: "dist/index.js",
			instances: 1,
			exec_mode: "fork",
			env: {
				NODE_ENV: "production",
				SERVE_FRONTEND: "true",
				PORT: "3000",
				ROBOT_PORT: "3001",
				LOG_LEVEL: "info",
			},
			env_file: "./backend/.env",
			max_memory_restart: "500M",
			error_file: "./logs/api-error.log",
			out_file: "./logs/api-out.log",
			merge_logs: true,
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",
			max_restarts: 5,
			restart_delay: 5000,
		},
	],
};

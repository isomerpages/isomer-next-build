const {
  AmplifyClient,
  CreateAppCommand,
  CreateBranchCommand,
  StartJobCommand,
} = require("@aws-sdk/client-amplify");

const AMPLIFY_BUILD_SPEC = `
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - rm -rf node_modules && rm -rf .next
        - curl https://raw.githubusercontent.com/opengovsg/isomer/main/tooling/build/scripts/preBuild.sh | bash
    build:
      commands:
        - curl https://raw.githubusercontent.com/opengovsg/isomer/main/tooling/build/scripts/build.sh | bash
  artifacts:
    baseDirectory: out
    files:
      - '**/*'
#   cache:
#     paths:
#       - .next/cache/**/*
#       - node_modules/**/*
`;

const amplifyClient = new AmplifyClient({ region: "ap-southeast-1" });

const createApp = async (appName) => {
  let appId = "";

  const params = new CreateAppCommand({
    name: appName,
    accessToken: process.env.GITHUB_TOKEN,
    repository: `https://github.com/isomerpages/${appName}`,
    buildSpec: AMPLIFY_BUILD_SPEC,
    environmentVariables: {
      NEXT_PUBLIC_ISOMER_NEXT_ENVIRONMENT: "staging",
    },
    customRules: [{ source: "</^[^.]+$|\.(?!(txt)$)([^.]+$)/>", target: "/404.html", status: "404" }],
  });

  await amplifyClient
    .send(params)
    .then((appInfo) => {
      appId = appInfo.app?.appId;

      // You can find the path to the app in the console
      // https://ap-southeast-1.console.aws.amazon.com/amplify/apps/appId
      // (replace appId with the actual appId)
      console.log("The appId is: ", appId);

      const mainBranchParams = new CreateBranchCommand({
        appId,
        branchName: "main",
        framework: "Next.js - SSG",
        enableAutoBuild: true,
        environmentVariables: {
          NEXT_PUBLIC_ISOMER_NEXT_ENVIRONMENT: "production",
        },
      });

      return amplifyClient.send(mainBranchParams);
    })
    .then(() =>
      amplifyClient.send(
        new CreateBranchCommand({
          appId,
          branchName: "staging",
          framework: "Next.js - SSG",
          enableAutoBuild: true,
        })
      )
    )
    .then(() =>
      amplifyClient.send(
        new StartJobCommand({
          appId,
          branchName: "main",
          jobType: "RELEASE",
        })
      )
    )
    .then(() =>
      amplifyClient.send(
        new StartJobCommand({
          appId,
          branchName: "staging",
          jobType: "RELEASE",
        })
      )
    );
};

createApp("mti-corp");

// Other steps:
// 1. Password protect the URL
// 2. Add to 1password vault


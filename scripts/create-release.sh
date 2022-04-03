#!/bin/bash

PREV_VERSION=$(git describe --tags --abbrev=0)
NEW_VERSION="v$(npx semver -i $PREV_VERSION)"

# read command arguments

POSITIONAL=()
while [[ $# -gt 0 ]]; do
  key="$1"

  case $key in
    -v|--version)
      NEW_VERSION="$2"
      shift # pass argument
      shift # pass value
      ;;
    -f|--force)
      FORCE_RELEASE="true"
      shift # pass argument
      ;;
    --login)
      LOGIN="true"
      shift # pass argument
      ;;
    *)    # unknown option
      POSITIONAL+=("$1")
      shift
      ;;
  esac
done

set -- "${POSITIONAL[@]}"

git checkout main && git pull

if [[ $LOGIN == "true" ]]
then
  gh auth login
fi

echo "Creating new release $NEW_VERSION (previous version is $PREV_VERSION)"

git tag -a $NEW_VERSION -m "$NEW_VERSION"
git push origin $NEW_VERSION

if [[ $FORCE_RELEASE == "true" ]]
then
  gh release create $NEW_VERSION --generate-notes -t $NEW_VERSION
else
  gh release create $NEW_VERSION -d --generate-notes -t $NEW_VERSION
fi

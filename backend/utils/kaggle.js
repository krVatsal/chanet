// kaggleHelper.js
import { KaggleNode } from 'kaggle-node';
import { ApiError } from './ApiError.js';
import { ApiResponse } from './ApiResponse.js';

const kaggle = new KaggleNode({
  credentials: {
    username: process.env.KAGGLE_USERNAME,
    key: process.env.KAGGLE_KEY,
  },
});

// Function to search for datasets based on a keyword
export async function searchDatasets(keyword) {
  try {
    const options = {
      search: keyword,
      sortBy: 'votes', // Options: 'hottest', 'votes', 'updated', 'active', 'relevance'
    //   page: 1,
    };
    const datasets = await kaggle.datasets.search(options);
    return datasets.data;
  } catch (error) {
    console.error('Error searching datasets:', error);
    throw new Error('Error searching datasets');
  }
}

// Function to display datasets based on a keyword
export async function displayDatasetOptions(keyword) {
  try {
    let datasets = await searchDatasets(keyword);
    if (datasets && datasets.length > 0) {
      console.log(`Found ${datasets.length} datasets for "${keyword}":`);
      // console.log(datasets)
      
      datasets=datasets.slice(0,5)
      datasets.forEach((dataset, index) => {
        console.log(`${index + 1}. ${dataset.title} by ${dataset.ref}- url ${dataset.url}`);
      });
    } else {
      console.log(`No datasets found for "${keyword}".`);
    }
    return new ApiResponse(200,datasets, 'Datasets recommended successfully')
  } catch (error) {
    console.error('Error displaying dataset options:', error);
    return new ApiError(500, "Failed to recommend dataset")
  }
}

// Function to download a dataset by its reference
export async function downloadDataset(datasetRef, downloadPath) {
  try {
    await kaggle.datasets.download(datasetRef, downloadPath);
    console.log(`Dataset ${datasetRef} downloaded to ${downloadPath}`);
  } catch (error) {
    console.error('Error downloading dataset:', error);
    throw new Error('Error downloading dataset');
  }
}

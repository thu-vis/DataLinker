from sklearn.cluster import KMeans
import numpy as np


class Aggregation:
    def __init__(self):
        self.labels = None
        self.centers = None
        self.k = 0


    def reset_labels(self, labels):
        cluster_cnt = self.k
        label_cnt = np.unique(labels).shape[0]
        label_cnt = np.zeros((cluster_cnt, label_cnt))
        for i, label in enumerate(self.labels):
            label_cnt[label][labels[i]] += 1
        true_label = [i for i in range(cluster_cnt)]
        for i in range(cluster_cnt):
            true_label[i] = int(np.argmax(label_cnt[i]))
        for i in range(len(self.labels)):
            self.labels[i] = true_label[self.labels[i]]

    def aggregate(self, x, k):
        self.k = k
        kmeans = KMeans(n_clusters=k, random_state=1).fit(x)
        self.labels = kmeans.labels_
        self.centers = kmeans.cluster_centers_
        return kmeans
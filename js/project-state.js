export function createProjectStore(present) {
    let currentProject = null;

    return Object.freeze({
        getProject() {
            return currentProject;
        },
        commit(project) {
            present(project);
            currentProject = project;
            return currentProject;
        },
    });
}
